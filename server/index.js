import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { WebSocketServer } from 'ws';

// Use Claude Code provider which spawns Claude CLI with its own auth
import { claudeCode } from 'ai-sdk-provider-claude-code';
import { streamText, streamObject, convertToModelMessages } from 'ai';
import { z } from 'zod';

// AI SDK 6.0 - Structured Output Schema for Plan Mode
const PlanStepSchema = z.object({
  id: z.string().describe('Unique identifier for this step'),
  label: z.string().describe('Short label for the step'),
  description: z.string().describe('Detailed description of what this step involves'),
  files: z.array(z.string()).optional().describe('Files that will be modified in this step'),
});

const PlanResponseSchema = z.object({
  thinking: z.string().describe('Internal reasoning about the task and approach'),
  plan: z.object({
    title: z.string().describe('Short title for the implementation plan'),
    summary: z.string().describe('Brief summary of the overall approach'),
    steps: z.array(PlanStepSchema).describe('Ordered list of implementation steps'),
  }),
  questions: z.array(z.string()).optional().describe('Questions for user clarification before proceeding'),
});

// ==========================================
// Tool Approval System (AI SDK 6.0)
// ==========================================

// Tools that are always safe (read-only)
const SAFE_TOOLS = ['Read', 'Glob', 'Grep', 'LS', 'WebSearch', 'WebFetch', 'Task', 'TodoWrite'];

// Tools that require approval
const APPROVAL_REQUIRED_TOOLS = ['Edit', 'Write', 'Bash', 'MultiEdit', 'NotebookEdit'];

// Pending tool approvals: Map<approvalId, { resolve, reject, toolName, input }>
const pendingToolApprovals = new Map();

// Connected WebSocket clients for tool approval
const toolApprovalClients = new Set();

// Generate unique approval ID
const generateApprovalId = () => `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Request tool approval from connected clients
const requestToolApproval = (toolName, input) => {
  return new Promise((resolve, reject) => {
    const approvalId = generateApprovalId();

    // Store the pending approval
    pendingToolApprovals.set(approvalId, {
      resolve,
      reject,
      toolName,
      input,
      createdAt: Date.now(),
    });

    // Broadcast to all connected approval clients
    const message = JSON.stringify({
      type: 'tool-approval-request',
      approvalId,
      toolName,
      input,
      timestamp: Date.now(),
    });

    for (const client of toolApprovalClients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    }

    // Timeout after 5 minutes
    setTimeout(() => {
      if (pendingToolApprovals.has(approvalId)) {
        pendingToolApprovals.delete(approvalId);
        reject(new Error('Tool approval timed out'));
      }
    }, 5 * 60 * 1000);
  });
};

// Handle approval response
const handleApprovalResponse = (approvalId, approved, reason) => {
  const pending = pendingToolApprovals.get(approvalId);
  if (!pending) {
    console.warn(`No pending approval found for ${approvalId}`);
    return false;
  }

  pendingToolApprovals.delete(approvalId);

  if (approved) {
    pending.resolve(true);
  } else {
    pending.resolve(false);
  }

  return true;
};

import {
  startLogin,
  completeLogin,
  getAccessToken,
  getStatus,
  logout
} from './oauth.js';

import { handleTerminalWebSocket } from './terminal.js';

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

const runScript = async (workspacePath, script) => {
  const { stdout, stderr } = await execFileAsync('sh', ['-c', script], {
    cwd: workspacePath,
    env: {
      ...process.env,
      CONDUCTOR_WORKSPACE_PATH: workspacePath,
      CONDUCTOR_ROOT_PATH: WORKSPACES_ROOT,
    }
  });
  return stdout + stderr;
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

// Get diff hunks for a specific file
const getFileDiffHunks = async (workspacePath, filePath) => {
  try {
    // Get the unified diff for this specific file
    const diffOutput = await git(['diff', '--', filePath], workspacePath);
    if (!diffOutput) {
      // Try showing the file content for new files
      const statusLines = await parseStatusLines(workspacePath);
      const fileStatus = statusLines.find(s => s.filePath === filePath);
      if (fileStatus?.status === '??') {
        // Untracked file - read content and show as all additions
        const fullPath = path.join(workspacePath, filePath);
        const content = await readFile(fullPath, 'utf8');
        const lines = content.split('\n').map(line => '+' + line);
        return [{
          header: `@@ -0,0 +1,${lines.length} @@ (new file)`,
          lines: lines
        }];
      }
      return [];
    }

    // Parse diff output into hunks
    const hunks = [];
    const lines = diffOutput.split('\n');
    let currentHunk = null;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        currentHunk = {
          header: line,
          lines: []
        };
      } else if (currentHunk && !line.startsWith('diff ') && !line.startsWith('index ') && !line.startsWith('---') && !line.startsWith('+++')) {
        currentHunk.lines.push(line);
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return hunks;
  } catch (error) {
    console.error('Failed to get diff hunks:', error);
    return [];
  }
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

  if (parsed.pathname === '/api/file' && method === 'GET') {
    try {
      const filePath = parsed.searchParams.get('path');
      if (!filePath) return sendError(res, 400, 'path is required');
      const content = await readFile(filePath, 'utf8');
      return sendJson(res, 200, { content });
    } catch (error) {
      return sendError(res, 404, 'File not found');
    }
  }

  // Binary file endpoint for images, audio, video, PDFs, etc.
  if (parsed.pathname === '/api/file/binary' && method === 'GET') {
    try {
      const filePath = parsed.searchParams.get('path');
      if (!filePath) return sendError(res, 400, 'path is required');

      const content = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Determine MIME type
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp',
        '.ico': 'image/x-icon',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
        '.aac': 'audio/aac',
        '.m4a': 'audio/mp4',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
      };

      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': content.length,
      });
      return res.end(content);
    } catch (error) {
      return sendError(res, 404, 'File not found');
    }
  }

  if (parsed.pathname === '/api/file' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (!body?.path) return sendError(res, 400, 'path is required');
      if (typeof body.content !== 'string') return sendError(res, 400, 'content is required');
      await writeFile(body.path, body.content, 'utf8');
      return sendJson(res, 200, { success: true });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to save file');
    }
  }

  // ==========================================
  // File Browser Endpoint
  // ==========================================

  if (parsed.pathname === '/api/files/browse' && method === 'GET') {
    try {
      let requestedPath = parsed.searchParams.get('path') || '~';

      // Expand ~ to home directory
      if (requestedPath.startsWith('~')) {
        requestedPath = requestedPath.replace(/^~/, os.homedir());
      }

      // Resolve to absolute path
      const absolutePath = path.resolve(requestedPath);

      // Read directory contents
      const dirEntries = await readdir(absolutePath, { withFileTypes: true });

      const entries = await Promise.all(
        dirEntries.map(async (dirent) => {
          const entryPath = path.join(absolutePath, dirent.name);
          const isHidden = dirent.name.startsWith('.');

          return {
            name: dirent.name,
            path: entryPath,
            isDirectory: dirent.isDirectory(),
            isHidden
          };
        })
      );

      return sendJson(res, 200, {
        path: absolutePath,
        entries
      });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to browse directory');
    }
  }

  // ==========================================
  // Shell Actions (Finder, Terminal)
  // ==========================================

  if (parsed.pathname === '/api/shell/open-folder' && method === 'GET') {
    try {
      let folderPath = parsed.searchParams.get('path') || '';
      if (folderPath.startsWith('~')) {
        folderPath = folderPath.replace(/^~/, os.homedir());
      }
      // macOS: open in Finder
      await execFileAsync('open', [folderPath]);
      return sendJson(res, 200, { success: true });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to open folder');
    }
  }

  if (parsed.pathname === '/api/shell/open-terminal' && method === 'GET') {
    try {
      let folderPath = parsed.searchParams.get('path') || '';
      if (folderPath.startsWith('~')) {
        folderPath = folderPath.replace(/^~/, os.homedir());
      }
      // macOS: open Terminal.app at the specified directory
      await execFileAsync('open', ['-a', 'Terminal', folderPath]);
      return sendJson(res, 200, { success: true });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to open terminal');
    }
  }

  // ==========================================
  // GitHub Endpoints (uses gh CLI)
  // ==========================================

  if (parsed.pathname === '/api/github/auth/status' && method === 'GET') {
    try {
      const { stdout } = await execFileAsync('gh', ['auth', 'status', '--show-token'], { encoding: 'utf8' }).catch(() => ({ stdout: '' }));
      if (!stdout || stdout.includes('not logged')) {
        return sendJson(res, 200, { authenticated: false });
      }
      // Get user info
      const userResult = await execFileAsync('gh', ['api', 'user'], { encoding: 'utf8' }).catch(() => ({ stdout: '{}' }));
      const user = JSON.parse(userResult.stdout || '{}');
      return sendJson(res, 200, {
        authenticated: true,
        user: {
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
          email: user.email,
        }
      });
    } catch (error) {
      return sendJson(res, 200, { authenticated: false });
    }
  }

  if (parsed.pathname === '/api/github/repos' && method === 'GET') {
    try {
      const sort = parsed.searchParams.get('sort') || 'updated';
      const limit = parsed.searchParams.get('limit') || '30';
      const { stdout } = await execFileAsync('gh', [
        'repo', 'list', '--json', 'name,fullName,description,url,sshUrl,defaultBranch,isPrivate,isFork,stargazerCount,primaryLanguage,updatedAt,pushedAt',
        '--limit', limit,
        '--sort', sort
      ], { encoding: 'utf8' });
      const repos = JSON.parse(stdout || '[]').map(r => ({
        id: r.fullName,
        name: r.name,
        full_name: r.fullName,
        description: r.description,
        html_url: r.url,
        clone_url: `${r.url}.git`,
        ssh_url: r.sshUrl,
        default_branch: r.defaultBranch,
        private: r.isPrivate,
        fork: r.isFork,
        stargazers_count: r.stargazerCount,
        language: r.primaryLanguage?.name || null,
        updated_at: r.updatedAt,
        pushed_at: r.pushedAt,
      }));
      return sendJson(res, 200, { repos });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to fetch repos');
    }
  }

  if (parsed.pathname === '/api/github/starred' && method === 'GET') {
    try {
      const limit = parsed.searchParams.get('limit') || '10';
      const { stdout } = await execFileAsync('gh', [
        'api', 'user/starred', '--jq', `.[0:${limit}] | .[] | {id: .id, name: .name, full_name: .full_name, description: .description, html_url: .html_url, clone_url: .clone_url, ssh_url: .ssh_url, default_branch: .default_branch, private: .private, fork: .fork, stargazers_count: .stargazers_count, language: .language, updated_at: .updated_at, pushed_at: .pushed_at}`
      ], { encoding: 'utf8' });
      const repos = stdout.trim().split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);
      return sendJson(res, 200, { repos });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to fetch starred repos');
    }
  }

  if (parsed.pathname === '/api/github/search' && method === 'GET') {
    try {
      const query = parsed.searchParams.get('q') || '';
      if (!query) return sendJson(res, 200, { repos: [] });
      const { stdout } = await execFileAsync('gh', [
        'search', 'repos', query, '--json', 'fullName,description,url,stargazerCount,primaryLanguage,updatedAt', '--limit', '20'
      ], { encoding: 'utf8' });
      const repos = JSON.parse(stdout || '[]').map(r => ({
        id: r.fullName,
        name: r.fullName.split('/')[1],
        full_name: r.fullName,
        description: r.description,
        html_url: r.url,
        clone_url: `${r.url}.git`,
        stargazers_count: r.stargazerCount,
        language: r.primaryLanguage?.name || null,
        updated_at: r.updatedAt,
      }));
      return sendJson(res, 200, { repos });
    } catch (error) {
      return sendError(res, 500, error.message || 'Failed to search repos');
    }
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
      if (!body?.code || !body?.verifier || !body?.state) {
        return sendError(res, 400, 'Code, verifier, and state are required');
      }

      // Security: Validate state against pending flows (CSRF protection)
      const pendingFlow = pendingOAuthFlows.get(body.state);
      if (!pendingFlow) {
        return sendError(res, 400, 'Invalid or expired OAuth flow. Please start login again.');
      }

      // Verify the verifier matches what we stored
      if (pendingFlow.verifier !== body.verifier) {
        pendingOAuthFlows.delete(body.state);
        return sendError(res, 400, 'Invalid PKCE verifier. Please start login again.');
      }

      // Check if flow has expired (10 minutes)
      if (Date.now() - pendingFlow.createdAt > 10 * 60 * 1000) {
        pendingOAuthFlows.delete(body.state);
        await savePendingFlows(pendingOAuthFlows);
        return sendError(res, 400, 'OAuth flow expired. Please start login again.');
      }

      const result = await completeLogin(body.code, body.verifier, body.state);

      // Always clean up the pending flow after attempt (one-time use)
      pendingOAuthFlows.delete(body.state);
      await savePendingFlows(pendingOAuthFlows);

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
  // AI Code Review Endpoint (uses Claude Code CLI)
  // ==========================================

  if (parsed.pathname === '/api/review' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (!body?.diffs || !Array.isArray(body.diffs)) {
        return sendError(res, 400, 'diffs array is required');
      }

      const workspacePath = body.workspacePath || process.cwd();

      // Build a diff summary for review
      const diffSummary = body.diffs.map(d =>
        `File: ${d.path} (+${d.added}/-${d.removed}) [${d.status}]`
      ).join('\n');

      // Get actual file contents for changed files (limit to first 5)
      const fileContents = [];
      for (const diff of body.diffs.slice(0, 5)) {
        try {
          const filePath = path.join(workspacePath, diff.path);
          const content = await readFile(filePath, 'utf8');
          fileContents.push({
            path: diff.path,
            content: content.slice(0, 5000), // Limit to 5k chars per file
            status: diff.status,
          });
        } catch {
          // File might not exist (deleted)
        }
      }

      const reviewPrompt = `You are an expert code reviewer. Analyze these code changes and provide specific, actionable feedback.

## Changed Files Summary
${diffSummary}

## File Contents
${fileContents.map(f => `### ${f.path} (${f.status})
\`\`\`
${f.content}
\`\`\`
`).join('\n')}

Provide a JSON response with:
1. "summary": Brief overall assessment (1-2 sentences)
2. "suggestions": Array of specific improvement suggestions (max 6)
3. "issues": Array of potential bugs or problems found
4. "security": Any security concerns
5. "rating": Overall rating (good/needs-work/critical)

Focus on:
- Logic errors and edge cases
- Performance issues
- Security vulnerabilities
- Code quality and maintainability
- Missing error handling`;

      // Use claudeCode provider (uses CLI auth)
      const result = await streamText({
        model: claudeCode('haiku'), // Use haiku for faster reviews
        system: 'You are an expert code reviewer. Respond only with valid JSON.',
        prompt: reviewPrompt,
        maxTokens: 2000,
      });

      // Collect the response
      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      // Parse JSON response
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = fullText.match(/```json?\s*([\s\S]*?)```/) || [null, fullText];
        const review = JSON.parse(jsonMatch[1] || fullText);
        return sendJson(res, 200, { success: true, review });
      } catch {
        // If JSON parsing fails, return structured response from text
        return sendJson(res, 200, {
          success: true,
          review: {
            summary: 'Review completed',
            suggestions: fullText.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().slice(2)),
            issues: [],
            security: null,
            rating: 'good',
            rawResponse: fullText,
          }
        });
      }
    } catch (error) {
      console.error('Review error:', error);
      return sendError(res, 500, error.message || 'Failed to generate review');
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

      // Map thinking level to max_tokens and thinking budget
      let maxTokens = 8192;
      let thinkingBudget = null;
      const level = body.level?.toLowerCase();

      if (level === 'low') {
        maxTokens = 8192;
        thinkingBudget = 2000;
      } else if (level === 'medium') {
        maxTokens = 16384;
        thinkingBudget = 5000;
      } else if (level === 'high') {
        maxTokens = 32768;
        thinkingBudget = 10000;
      } else if (level === 'megathink') {
        maxTokens = 64000;
        thinkingBudget = 30000;
      }

      // Select model - claudeCode uses its own model naming
      let modelId = 'sonnet';
      if (body.model?.includes('haiku')) modelId = 'haiku';
      if (body.model?.includes('opus')) modelId = 'opus';

      // Convert UIMessages (from frontend) to ModelMessages (for AI SDK)
      const modelMessages = await convertToModelMessages(body.messages);

      // Determine system prompt based on planMode
      const isPlanMode = body.planMode === true;

      const normalSystemPrompt = `You are Mozart, an elite local-first AI coding orchestrator.
You manage isolated git worktrees for parallel development.
Be concise and direct. Use Markdown for formatting.
When thinking through problems, show your reasoning.
When proposing changes, be specific about files and line numbers.`;

      const planModeSystemPrompt = `You are Mozart in PLANNING MODE. Your role is to help architect and plan implementations.

IMPORTANT RESTRICTIONS IN PLAN MODE:
- You can ONLY read, search, and view files - NO writing or editing allowed
- You can use TodoWrite to create task lists and plans
- Focus on understanding the codebase and creating detailed implementation plans
- Analyze code structure, dependencies, and potential impacts
- Create step-by-step task breakdowns using TodoWrite
- Identify files that will need changes (but don't make changes yet)
- Consider edge cases, error handling, and testing requirements

When planning:
1. First explore and understand the relevant code
2. Create a clear plan with specific steps using TodoWrite
3. List all files that will need modification
4. Identify potential risks or blockers
5. Suggest a testing strategy

Be thorough in your analysis. A good plan now saves debugging later.`;

      // AI SDK 6.0: Use structured output for plan mode when requested
      const useStructuredOutput = isPlanMode && body.structuredOutput === true;

      if (useStructuredOutput) {
        // Structured output mode - returns guaranteed JSON schema
        const result = streamObject({
          model: claudeCode(modelId, {
            allowedTools: ['Read', 'Glob', 'Grep', 'LS', 'TodoWrite', 'WebSearch', 'WebFetch', 'Task']
          }),
          schema: PlanResponseSchema,
          system: planModeSystemPrompt,
          messages: modelMessages,
          ...(thinkingBudget && {
            providerOptions: {
              anthropic: {
                thinking: { type: 'enabled', budgetTokens: thinkingBudget }
              }
            }
          })
        });

        // Stream the structured object as JSON
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        for await (const partial of result.partialObjectStream) {
          res.write(`data: ${JSON.stringify({ type: 'partial', data: partial })}\n\n`);
        }

        const finalObject = await result.object;
        res.write(`data: ${JSON.stringify({ type: 'complete', data: finalObject })}\n\n`);
        res.end();
        return;
      }

      // Check if tool approval is enabled
      const toolApprovalEnabled = body.toolApproval === true;

      // Build model options
      const modelOptions = {
        // In plan mode, restrict to read-only tools
        ...(isPlanMode && {
          allowedTools: ['Read', 'Glob', 'Grep', 'LS', 'TodoWrite', 'WebSearch', 'WebFetch', 'Task']
        }),
        // Enable streaming input for canUseTool (AI SDK 6.0)
        ...(toolApprovalEnabled && {
          streamingInput: 'auto',
          canUseTool: async ({ name, input }) => {
            // Always approve safe/read-only tools
            if (SAFE_TOOLS.includes(name)) {
              return true;
            }

            // For tools requiring approval, request human approval
            if (APPROVAL_REQUIRED_TOOLS.includes(name)) {
              console.log(`Tool approval requested: ${name}`, input);
              try {
                const approved = await requestToolApproval(name, input);
                console.log(`Tool ${name} ${approved ? 'approved' : 'rejected'}`);
                return approved;
              } catch (error) {
                console.error(`Tool approval error for ${name}:`, error);
                return false; // Deny on error/timeout
              }
            }

            // Default: approve unknown tools (they may be custom)
            return true;
          }
        })
      };

      // Build streamText options (default mode)
      const streamOptions = {
        model: claudeCode(modelId, modelOptions),
        maxTokens,
        temperature: body.temperature,
        topP: body.topP,
        system: isPlanMode ? planModeSystemPrompt : normalSystemPrompt,
        messages: modelMessages,
      };

      // Enable extended thinking if level is set
      if (thinkingBudget) {
        streamOptions.providerOptions = {
          anthropic: {
            thinking: {
              type: 'enabled',
              budgetTokens: thinkingBudget
            }
          }
        };
      }

      // Use Claude Code provider with streaming
      const result = streamText(streamOptions);

      result.pipeUIMessageStreamToResponse(res);
      return;
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

  if (parsed.pathname.startsWith('/api/workspaces/')) {
    const parts = parsed.pathname.split('/').filter(Boolean);
    const workspaceId = parts[2];
    const action = parts[3];
    
    if (!workspaceId) return sendError(res, 404, 'Workspace ID required');

    const state = await loadState();
    const entry = state.workspaces[workspaceId];
    if (!entry) return sendError(res, 404, 'Workspace not found');

    if (method === 'POST' && action === 'run-script') {
      try {
        const body = await readJsonBody(req);
        const scriptType = body?.type;
        if (!scriptType) return sendError(res, 400, 'script type is required');

        const configPath = path.join(entry.path, 'conductor.json');
        const config = JSON.parse(await readFile(configPath, 'utf8').catch(() => '{}'));
        const script = config[scriptType];

        if (!script) {
          return sendError(res, 400, `No ${scriptType} script defined in conductor.json`);
        }

        const output = await runScript(entry.path, script);
        return sendJson(res, 200, { success: true, output });
      } catch (error) {
        return sendError(res, 500, error.message || 'Failed to run script');
      }
    } else if (method === 'GET') {
      try {
        if (action === 'diffs') {
          const diffs = await getDiffs(entry.path);
          return sendJson(res, 200, { diffs });
        }
        if (action === 'files') {
          const fileTree = await getFileTree(entry.path);
          return sendJson(res, 200, { fileTree });
        }
        if (action === 'config') {
          try {
            const configPath = path.join(entry.path, 'conductor.json');
            const content = await readFile(configPath, 'utf8');
            return sendJson(res, 200, JSON.parse(content));
          } catch {
            return sendJson(res, 200, {});
          }
        }
        if (action === 'diff-hunks') {
          const filePathParam = parsed.searchParams.get('file');
          if (!filePathParam) return sendError(res, 400, 'Missing file parameter');
          const hunks = await getFileDiffHunks(entry.path, filePathParam);
          return sendJson(res, 200, { hunks });
        }
      } catch (error) {
        return sendError(res, 500, error.message || 'Failed to load workspace data');
      }
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

  // WebSocket server for terminal
  const wss = new WebSocketServer({ server, path: '/api/terminal' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    const cwd = url.searchParams.get('cwd') || process.cwd();
    console.log(`Terminal WebSocket connected, cwd: ${cwd}`);
    handleTerminalWebSocket(ws, cwd);
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // WebSocket server for tool approval (AI SDK 6.0 human-in-the-loop)
  const toolApprovalWss = new WebSocketServer({ server, path: '/api/tool-approval' });

  toolApprovalWss.on('connection', (ws) => {
    console.log('Tool approval WebSocket connected');
    toolApprovalClients.add(ws);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'approval-response') {
          const { approvalId, approved, reason } = message;
          const handled = handleApprovalResponse(approvalId, approved, reason);

          // Acknowledge the response
          ws.send(JSON.stringify({
            type: 'approval-acknowledged',
            approvalId,
            handled,
          }));
        }
      } catch (error) {
        console.error('Tool approval message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Tool approval WebSocket disconnected');
      toolApprovalClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('Tool approval WebSocket error:', error);
      toolApprovalClients.delete(ws);
    });

    // Send current pending approvals to newly connected client
    for (const [approvalId, pending] of pendingToolApprovals) {
      ws.send(JSON.stringify({
        type: 'tool-approval-request',
        approvalId,
        toolName: pending.toolName,
        input: pending.input,
        timestamp: pending.createdAt,
      }));
    }
  });

  toolApprovalWss.on('error', (error) => {
    console.error('Tool approval WebSocket server error:', error);
  });

  server.listen(PORT, () => {
    console.log(`Mozart API server running on http://localhost:${PORT}`);
    console.log(`Terminal WebSocket available at ws://localhost:${PORT}/api/terminal`);
    console.log(`Tool Approval WebSocket available at ws://localhost:${PORT}/api/tool-approval`);
  });

  callbackServer.listen(OAUTH_CALLBACK_PORT, () => {
    console.log(`OAuth callback server running on http://localhost:${OAUTH_CALLBACK_PORT}`);
  });
};

start();
