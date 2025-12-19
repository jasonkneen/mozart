import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.CONDUCTOR_SERVER_PORT || 4545);
const WORKSPACES_ROOT = process.env.CONDUCTOR_WORKSPACES_ROOT || path.join(os.homedir(), 'conductor', 'workspaces');
const REPOS_ROOT = process.env.CONDUCTOR_REPOS_ROOT || path.join(os.homedir(), 'conductor', 'repos');
const STATE_PATH = process.env.CONDUCTOR_STATE_PATH || path.join(__dirname, 'state.json');

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

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/^-+|-+$/g, '');

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

const start = async () => {
  await ensureWorkspacesRoot();
  await ensureStatePath();
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error(error);
      sendError(res, 500, 'Internal server error');
    });
  });

  server.listen(PORT, () => {
    console.log(`Conductor git service running on http://localhost:${PORT}`);
  });
};

start();
