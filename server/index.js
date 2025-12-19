import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Use Claude Code provider which spawns Claude CLI with its own auth
import { claudeCode } from 'ai-sdk-provider-claude-code';
import { streamText } from 'ai';

import {
  startLogin,
  completeLogin,
  getAccessToken,
  getStatus,
  logout
} from './oauth.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.CONDUCTOR_SERVER_PORT || 4545);
const OAUTH_CALLBACK_PORT = 54545;
const WORKSPACES_ROOT = process.env.CONDUCTOR_WORKSPACES_ROOT || path.join(os.homedir(), 'conductor', 'workspaces');
const REPOS_ROOT = process.env.CONDUCTOR_REPOS_ROOT || path.join(os.homedir(), 'conductor', 'repos');
const STATE_PATH = process.env.CONDUCTOR_STATE_PATH || path.join(__dirname, 'state.json');

// Persistent storage for pending OAuth flows
const PENDING_FLOWS_PATH = path.join(os.tmpdir(), 'mozart-oauth-flows.json');

const loadPendingFlows = async () => {
  try {
    const raw = await readFile(PENDING_FLOWS_PATH, 'utf8');
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
};

const savePendingFlows = async (flows) => {
  await writeFile(PENDING_FLOWS_PATH, JSON.stringify(Object.fromEntries(flows)));
};

let pendingOAuthFlows = new Map();

// Load flows on startup
loadPendingFlows().then(flows => {
  pendingOAuthFlows = flows;
  // Clean up old flows (older than 10 minutes)
  const now = Date.now();
  for (const [state, flow] of pendingOAuthFlows) {
    if (now - flow.createdAt > 10 * 60 * 1000) {
      pendingOAuthFlows.delete(state);
    }
  }
  savePendingFlows(pendingOAuthFlows);
});

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return null;
  return JSON.parse(text);
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const sendError = (res, status, message) => {
  sendJson(res, status, { error: message });
};

const loadState = async () => {
  try {
    const raw = await readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return { workspaces: {} };
  }
};

const saveState = async (state) => {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
};

const git = async (args, cwd) => {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
};

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9\\-]+/g, '-').replace(/^-+|-+$/g, '');

const resolveRepoRoot = async (repoPath) => {
  return git(['rev-parse', '--show-toplevel'], repoPath);
};

const getDefaultBranch = async (repoRoot) => {
  try {
    const headRef = await git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], repoRoot);
    return headRef.split('/').pop() || 'main';
  } catch (error) {
    const current = await git(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
    return current || 'main';
  }
};

const branchExists = async (repoRoot, branch) => {
  try {
    await git(['show-ref', '--verify', `refs/heads/${branch}`], repoRoot);
    return true;
  } catch (error) {
    return false;
  }
};

const branchExistsRemote = async (repoUrl, branch) => {
  try {
    const output = await git(['ls-remote', '--heads', repoUrl, branch], process.cwd());
    return Boolean(output);
  } catch (error) {
    return false;
  }
};

const ensureWorkspacesRoot = async () => {
  await mkdir(WORKSPACES_ROOT, { recursive: true });
};

const ensureStatePath = async () => {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
};

const ensureReposRoot = async () => {
  await mkdir(REPOS_ROOT, { recursive: true });
};

const repoNameFromUrl = (repoUrl) => {
  const stripped = repoUrl.replace(/\\.git$/, '');
  const parts = stripped.split('/');
  return parts[parts.length - 1] || 'repo';
};

const cloneRepo = async (repoUrl) => {
  await ensureReposRoot();
  const repoName = repoNameFromUrl(repoUrl);
  const slug = slugify(repoName) || 'repo';
  const repoFolder = `${slug}-${Math.floor(Math.random() * 1000)}`;
  const repoPath = path.join(REPOS_ROOT, repoFolder);
  await git(['clone', repoUrl, repoPath], process.cwd());
  return repoPath;
};

const parseStatusLines = async (workspacePath) => {
  const output = await git(['status', '--porcelain'], workspacePath);
  const lines = output ? output.split('\n') : [];
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2).trim();
      const filePath = line.slice(3).trim();
      return { status, filePath };
    });
};

const mapStatus = (status) => {
  if (status.includes('A')) return 'added';
  if (status.includes('D')) return 'deleted';
  if (status.includes('R')) return 'renamed';
  return 'modified';
};

const getDiffs = async (workspacePath) => {
  const numstatRaw = await git(['diff', '--numstat'], workspacePath);
  const numstatLines = numstatRaw ? numstatRaw.split('\n') : [];
  const diffMap = new Map();

  numstatLines.forEach((line) => {
    const parts = line.split('\t');
    if (parts.length < 3) return;
    const added = Number(parts[0]) || 0;
    const removed = Number(parts[1]) || 0;
    const filePath = parts.slice(2).join('\t');
    diffMap.set(filePath, { path: filePath, added, removed });
  });

  const statusLines = await parseStatusLines(workspacePath);
  statusLines.forEach(({ status, filePath }) => {
    if (!diffMap.has(filePath)) {
      diffMap.set(filePath, { path: filePath, added: 0, removed: 0 });
    }
    const entry = diffMap.get(filePath);
    entry.status = mapStatus(status);
  });

  return Array.from(diffMap.values()).map((entry) => ({
    path: entry.path,
    added: entry.added,
    removed: entry.removed,
    status: entry.status || 'modified'
  }));
};

const addToTree = (root, filePath) => {
  const parts = filePath.split('/');
  let current = root;
  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    const existing = current.children.find((node) => node.name === part);
    if (existing) {
      current = existing;
      return;
    }
    const node = {
      name: part,
      path: `/${parts.slice(0, index + 1).join('/')}`,
      type: isLast ? 'file' : 'directory',
      children: isLast ? undefined : []
    };
    current.children.push(node);
    current = node;
  });
};

const getFileTree = async (workspacePath) => {
  const tracked = await git(['ls-files'], workspacePath);
  const trackedFiles = tracked ? tracked.split('\n').filter(Boolean) : [];
  const statusLines = await parseStatusLines(workspacePath);
  const untracked = statusLines
    .filter(({ status }) => status === '??')
    .map(({ filePath }) => filePath);

  const root = { name: '/', path: '/', type: 'directory', children: [] };
  [...trackedFiles, ...untracked].forEach((filePath) => addToTree(root, filePath));

  return root.children;
};

const createWorkspace = async (body) => {
  if (!body?.repoPath && !body?.repoUrl) {
    throw new Error('repoPath or repoUrl is required to create a workspace');
  }

  const resolvedRepoPath = body.repoUrl ? await cloneRepo(body.repoUrl) : body.repoPath;
  const repoRoot = await resolveRepoRoot(resolvedRepoPath);
  const baseBranch = body.baseBranch || (await getDefaultBranch(repoRoot));
  const branch = body.branch || `ai/task-${Date.now()}`;
  const branchName = slugify(branch) || `ai-task-${Date.now()}`;
  const workspaceId = `ws-${Date.now()}`;
  const suffix = Math.floor(Math.random() * 1000);
  const workspaceFolder = `${branchName}-${suffix}`;
  const workspacePath = path.join(WORKSPACES_ROOT, workspaceFolder);

  await ensureWorkspacesRoot();

  const exists = await branchExists(repoRoot, branchName);
  if (exists) {
    await git(['worktree', 'add', workspacePath, branchName], repoRoot);
  } else {
    await git(['worktree', 'add', '-b', branchName, workspacePath, baseBranch], repoRoot);
  }

  const state = await loadState();
  state.workspaces[workspaceId] = {
    id: workspaceId,
    path: workspacePath,
    repoPath: repoRoot,
    branch: branchName,
    name: body.name || branchName,
    createdAt: Date.now(),
    baseBranch
  };
  await ensureStatePath();
  await saveState(state);

  return {
    id: workspaceId,
    name: body.name || branchName,
    branch: branchName,
    baseBranch,
    location: workspaceFolder,
    timeAgo: 'just now',
    status: 'idle',
    fleetType: 'Nanobrowser',
    repo: path.basename(repoRoot),
    diffs: { added: 0, removed: 0 },
    repoPath: repoRoot,
    workspacePath
  };
};

const handleRequest = async (req, res) => {
  const { method, url } = req;
  if (!url) return sendError(res, 404, 'Not found');
  const parsed = new URL(url, `http://localhost:${PORT}`);

  if (parsed.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true });
  }

  // ==========================================
  // OAuth Endpoints
  // ==========================================

  if (parsed.pathname === '/api/oauth/status' && method === 'GET') {
    try {
      const result = await getStatus();
      if (!result.success) {
        return sendError(res, 500, result.error);
      }
      return sendJson(res, 200, { success: true, data: result.data });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to get status');
    }
  }

  if (parsed.pathname === '/api/oauth/start' && method === 'POST') {
    try {
      const result = await startLogin();
      if (!result.success) {
        return sendError(res, 400, result.error);
      }
      // Store the pending flow for callback (persist to disk)
      pendingOAuthFlows.set(result.data.state, {
        verifier: result.data.verifier,
        state: result.data.state,
        createdAt: Date.now()
      });
      await savePendingFlows(pendingOAuthFlows);
      return sendJson(res, 200, { success: true, data: result.data });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to start login');
    }
  }

  if (parsed.pathname === '/api/oauth/complete' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (!body?.code || !body?.verifier || !body?.state || !body?.stateParam) {
        return sendError(res, 400, 'Code, verifier, state, and stateParam are required');
      }
      const result = await completeLogin(body.code, body.verifier, body.state);
      if (!result.success) {
        return sendError(res, 400, result.error);
      }
      return sendJson(res, 200, { success: true, data: result.data });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to complete login');
    }
  }

  if (parsed.pathname === '/api/oauth/token' && method === 'GET') {
    try {
      const result = await getAccessToken();
      if (!result.success) {
        return sendError(res, 401, result.error);
      }
      return sendJson(res, 200, { success: true, data: result.data });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to get token');
    }
  }

  if (parsed.pathname === '/api/oauth/logout' && method === 'POST') {
    try {
      const result = await logout();
      if (!result.success) {
        return sendError(res, 500, result.error);
      }
      return sendJson(res, 200, { success: true, data: { message: result.data } });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to logout');
    }
  }

  // ==========================================
  // Chat Endpoint (uses OAuth token)
  // ==========================================

  if (parsed.pathname === '/api/chat' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (!body?.messages) {
        return sendError(res, 400, 'messages is required');
      }

      // Map thinking level to max_tokens
      let maxTokens = 4096;
      if (body.level === 'Think') maxTokens = 8192;
      if (body.level === 'Megathink') maxTokens = 16384;

      // Select model - claudeCode uses its own model naming
      let modelId = 'sonnet';
      if (body.model?.includes('haiku')) modelId = 'haiku';
      if (body.model?.includes('opus')) modelId = 'opus';

      // Use Claude Code provider with streaming - returns AI SDK compatible stream
      const result = streamText({
        model: claudeCode(modelId),
        maxTokens,
        system: `You are Conductor, an elite local-first AI coding orchestrator.
You manage isolated git worktrees.
Always wrap tool calls in trace blocks.
Available Trace Types: Thinking, Lint, Edit, Bash, Read, Plan.
Format your response with a clear 'Summary' header.
Use Markdown for rich text.
When proposing a plan, use the 'Plan' trace type to describe steps.`,
        messages: body.messages,
      });

      // Return text stream response (claudeCode provider doesn't support toDataStreamResponse)
      const response = result.toTextStreamResponse();

      // Copy headers from AI SDK response
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

      // Pipe the body
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
      return; // Important: return after streaming
    } catch (error) {
      console.error('Chat error:', error);
      return sendError(res, 500, error.message || 'Failed to generate response');
    }
  }

  // ==========================================
  // Workspace Endpoints
  // ==========================================

  if (parsed.pathname === '/api/workspaces' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const workspace = await createWorkspace(body);
      return sendJson(res, 200, workspace);
    } catch (error) {
      return sendError(res, 400, error.message || 'Failed to create workspace');
    }
  }

  if (parsed.pathname === '/api/repos/branch-exists' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (!body?.branch) {
        return sendError(res, 400, 'branch is required');
      }
      if (body.repoUrl) {
        const exists = await branchExistsRemote(body.repoUrl, body.branch);
        return sendJson(res, 200, { exists });
      }
      if (!body.repoPath) {
        return sendError(res, 400, 'repoPath or repoUrl is required');
      }
      const repoRoot = await resolveRepoRoot(body.repoPath);
      const exists = await branchExists(repoRoot, body.branch);
      return sendJson(res, 200, { exists });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to check branch');
    }
  }

  if (parsed.pathname.startsWith('/api/workspaces/') && method === 'GET') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    const workspaceId = parts[2];
    const action = parts[3];
    if (!workspaceId || !action) {
      return sendError(res, 404, 'Not found');
    }

    const state = await loadState();
    const entry = state.workspaces[workspaceId];
    if (!entry) return sendError(res, 404, 'Workspace not found');

    try {
      if (action === 'diffs') {
        const diffs = await getDiffs(entry.path);
        return sendJson(res, 200, { diffs });
      }
      if (action === 'files') {
        const fileTree = await getFileTree(entry.path);
        return sendJson(res, 200, { fileTree });
      }
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to load workspace data');
    }
  }

  return sendError(res, 404, 'Not found');
};

// ==========================================
// OAuth Callback Server (separate port)
// ==========================================

const handleOAuthCallback = async (req, res) => {
  const { url, method } = req;
  if (!url) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const parsed = new URL(url, `http://localhost:${OAUTH_CALLBACK_PORT}`);

  // Root page - show manual code entry form
  if (parsed.pathname === '/' || parsed.pathname === '') {
    // Check if there's an active pending flow
    const flows = Array.from(pendingOAuthFlows.entries());
    const activeFlow = flows.length > 0 ? flows[flows.length - 1] : null;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <title>Mozart OAuth</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #0a0a0f;
              color: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              max-width: 500px;
            }
            h1 { color: #60a5fa; margin-bottom: 10px; font-size: 24px; }
            p { color: #888; margin-bottom: 20px; font-size: 14px; }
            .form-group { margin-bottom: 15px; text-align: left; }
            label { display: block; color: #aaa; font-size: 12px; margin-bottom: 5px; }
            input {
              width: 100%;
              padding: 12px;
              border: 1px solid #333;
              border-radius: 8px;
              background: #1a1a2e;
              color: white;
              font-size: 14px;
              box-sizing: border-box;
            }
            input:focus { outline: none; border-color: #60a5fa; }
            button {
              width: 100%;
              padding: 12px;
              border: none;
              border-radius: 8px;
              background: #3b82f6;
              color: white;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              margin-top: 10px;
            }
            button:hover { background: #2563eb; }
            .status {
              margin-top: 20px;
              padding: 15px;
              border-radius: 8px;
              background: ${activeFlow ? '#1a2e1a' : '#2e1a1a'};
              border: 1px solid ${activeFlow ? '#22c55e33' : '#ef444433'};
            }
            .status-text { color: ${activeFlow ? '#22c55e' : '#ef4444'}; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎵 Mozart OAuth</h1>
            <p>Enter your authorization code manually if the redirect didn't work.</p>

            <form action="/submit-code" method="GET">
              <div class="form-group">
                <label>Authorization Code</label>
                <input type="text" name="code" placeholder="Paste your authorization code here" required />
              </div>
              <div class="form-group">
                <label>State (from URL)</label>
                <input type="text" name="state" placeholder="State parameter" value="${activeFlow ? activeFlow[0] : ''}" ${activeFlow ? 'readonly' : ''} required />
              </div>
              <button type="submit">Complete Login</button>
            </form>

            <div class="status">
              <div class="status-text">
                ${activeFlow
                  ? '✓ Active OAuth flow detected. Enter the code from the redirect URL.'
                  : '✗ No active OAuth flow. Start login from the app first.'}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Handle manual code submission
  if (parsed.pathname === '/submit-code') {
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');

    if (!code || !state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<html><body style="background:#0a0a0f;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><div><h1 style="color:#ef4444;">Error</h1><p>Missing code or state</p><a href="/" style="color:#60a5fa;">Try again</a></div></body></html>');
      return;
    }

    const pendingFlow = pendingOAuthFlows.get(state);
    if (!pendingFlow) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<html><body style="background:#0a0a0f;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><div><h1 style="color:#ef4444;">Error</h1><p>Unknown or expired OAuth flow. Start login again from the app.</p><a href="/" style="color:#60a5fa;">Back</a></div></body></html>');
      return;
    }

    try {
      const result = await completeLogin(code, pendingFlow.verifier, pendingFlow.state);
      pendingOAuthFlows.delete(state);

      if (!result.success) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<html><body style="background:#0a0a0f;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><div><h1 style="color:#ef4444;">Error</h1><p>${result.error}</p><a href="/" style="color:#60a5fa;">Try again</a></div></body></html>`);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #0a0a0f;
                color: white;
              }
              .container { text-align: center; padding: 40px; }
              h1 { color: #22c55e; margin-bottom: 20px; }
              p { color: #888; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Authentication Successful</h1>
              <p>You can close this window and return to Mozart.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      pendingOAuthFlows.delete(state);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="background:#0a0a0f;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><div><h1 style="color:#ef4444;">Error</h1><p>${error.message}</p><a href="/" style="color:#60a5fa;">Try again</a></div></body></html>`);
    }
    return;
  }

  if (parsed.pathname === '/callback') {
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');

    if (!code || !state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Error</h1><p>Missing code or state parameter</p></body></html>');
      return;
    }

    const pendingFlow = pendingOAuthFlows.get(state);
    if (!pendingFlow) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Error</h1><p>Unknown OAuth flow</p></body></html>');
      return;
    }

    try {
      const result = await completeLogin(code, pendingFlow.verifier, pendingFlow.state);
      pendingOAuthFlows.delete(state);

      if (!result.success) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h1>Error</h1><p>${result.error}</p></body></html>`);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #1a1a2e;
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
              }
              h1 { color: #00ff88; margin-bottom: 20px; }
              p { color: #888; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Authentication Successful</h1>
              <p>You can close this window and return to Mozart.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      pendingOAuthFlows.delete(state);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<html><body><h1>Error</h1><p>${error.message}</p></body></html>`);
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
};

const start = async () => {
  await ensureWorkspacesRoot();
  await ensureStatePath();

  // Main API server
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error(error);
      sendError(res, 500, 'Internal server error');
    });
  });

  // OAuth callback server (different port for redirect URI)
  const callbackServer = http.createServer((req, res) => {
    handleOAuthCallback(req, res).catch((error) => {
      console.error('OAuth callback error:', error);
      res.writeHead(500);
      res.end('Internal server error');
    });
  });

  server.listen(PORT, () => {
    console.log(`Mozart API server running on http://localhost:${PORT}`);
  });

  callbackServer.listen(OAUTH_CALLBACK_PORT, () => {
    console.log(`OAuth callback server running on http://localhost:${OAUTH_CALLBACK_PORT}`);
  });
};

start();
