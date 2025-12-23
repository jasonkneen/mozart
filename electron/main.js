import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { MCPManager } from './mcp-manager.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const claudeSessionPath = path.join(__dirname, '..', 'electron', 'claude-session.cjs');
const claudeSessionModule = require(claudeSessionPath);
const ClaudeSession = claudeSessionModule.ClaudeSession;

const execAsync = promisify(exec);

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win = null;
let serverProcess = null;

// Session Management
const sessions = new Map(); // workspaceId -> ClaudeSession
const mcpManager = new MCPManager();

function getSession(workspaceId = 'default') {
  if (!sessions.has(workspaceId)) {
    const session = new ClaudeSession();
    // Initialize with current MCP tools
    mcpManager.getAllTools().then(tools => session.updateMCPTools(tools));
    sessions.set(workspaceId, session);
  }
  return sessions.get(workspaceId);
}

async function handleStartSession(options) {
  const { prompt, model, cwd, workspaceId = 'default' } = options;
  const session = getSession(workspaceId);

  try {
    session.startStreamingSession({
      prompt,
      model: model || 'smart',
      cwd: cwd || process.cwd(),
      onTextChunk: (text) => {
        if (win && !win.isDestroyed()) {
          // Legacy event for default session
          if (workspaceId === 'default') {
            win.webContents.send('claude-code:text-chunk', text);
          }
          // New event with workspaceId
          win.webContents.send('agent:text-chunk', { workspaceId, chunk: text });
        }
      },
      onToolUse: (toolUse) => {
        if (win && !win.isDestroyed()) {
          if (workspaceId === 'default') {
            win.webContents.send('claude-code:tool-use', toolUse);
          }
          win.webContents.send('agent:tool-use', { workspaceId, toolUse });
        }
      },
      onToolResult: (result) => {
        if (win && !win.isDestroyed()) {
          if (workspaceId === 'default') {
            win.webContents.send('claude-code:tool-result', result);
          }
          win.webContents.send('agent:tool-result', { workspaceId, result });
        }
      },
      onComplete: () => {
        if (win && !win.isDestroyed()) {
          if (workspaceId === 'default') {
            win.webContents.send('claude-code:complete');
          }
          win.webContents.send('agent:complete', { workspaceId });
        }
      },
      onError: (error) => {
        if (win && !win.isDestroyed()) {
          if (workspaceId === 'default') {
            win.webContents.send('claude-code:error', error);
          }
          win.webContents.send('agent:error', { workspaceId, error });
        }
      },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// IPC Handlers - Agent / Claude Code
ipcMain.handle('claude-code:start-session', (_event, options) => handleStartSession(options));
ipcMain.handle('agent:start', (_event, options) => handleStartSession(options));

ipcMain.handle('claude-code:send-message', async (_event, text) => {
  // Legacy handler assumes default session
  try {
    const session = getSession('default');
    await session.sendMessage(text);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('agent:chat', async (_event, { workspaceId = 'default', message }) => {
  try {
    const session = getSession(workspaceId);
    await session.sendMessage(message);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('claude-code:is-active', async () => {
  const session = getSession('default');
  return { active: session.isSessionActive() };
});

ipcMain.handle('claude-code:stop', async () => {
  try {
    const session = getSession('default');
    await session.interruptCurrentResponse();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('agent:stop', async (_event, { workspaceId = 'default' } = {}) => {
  try {
    const session = getSession(workspaceId);
    await session.interruptCurrentResponse();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('claude-code:reset', async () => {
  try {
    const session = getSession('default');
    await session.resetSession();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// MCP IPC Handlers
ipcMain.handle('mcp:connect', async (_event, { connectionId, serverConfig }) => {
  try {
    const result = await mcpManager.connect(connectionId, serverConfig);
    if (result.success) {
      // Update all sessions with new tools
      const tools = await mcpManager.getAllTools();
      for (const session of sessions.values()) {
        session.updateMCPTools(tools);
      }
    }
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:disconnect', async (_event, { connectionId }) => {
  try {
    const result = await mcpManager.disconnect(connectionId);
    // Update tools after disconnect
    const tools = await mcpManager.getAllTools();
    for (const session of sessions.values()) {
      session.updateMCPTools(tools);
    }
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:list-tools', async (_event, { connectionId }) => {
  try {
    const tools = await mcpManager.listTools(connectionId);
    return { success: true, tools };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:call-tool', async (_event, { connectionId, toolName, args }) => {
  try {
    const result = await mcpManager.callTool(connectionId, toolName, args);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:get-connections', async () => {
  try {
    const connections = mcpManager.getConnections();
    return { success: true, connections };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#050505',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// Start the backend server
async function startServer() {
  const serverPath = path.join(process.env.APP_ROOT, 'server', 'index.js');

  serverProcess = spawn('node', [serverPath], {
    cwd: process.env.APP_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`[Server] Process exited with code ${code}`);
  });

  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Helper to find git root
async function getGitRoot(cwd) {
  try {
    const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd });
    return stdout.trim();
  } catch (error) {
    return cwd; // Fallback to cwd if not in git repo
  }
}

// Patch History / Git Checkpoint Handlers
ipcMain.handle('patchHistory:createCheckpoint', async (_event, { filePath, name }) => {
  try {
    const cwd = filePath ? path.dirname(filePath) : process.cwd();
    const gitRoot = await getGitRoot(cwd);
    
    // Add all changes
    await execAsync('git add .', { cwd: gitRoot });
    
    // Commit
    const commitMsg = name || `Checkpoint ${new Date().toISOString()}`;
    await execAsync(`git commit -m "${commitMsg}"`, { cwd: gitRoot });
    
    // Get the commit hash
    const { stdout: hash } = await execAsync('git rev-parse HEAD', { cwd: gitRoot });
    
    return { success: true, checkpointId: hash.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('patchHistory:restoreCheckpoint', async (_event, { filePath, checkpointId }) => {
  try {
    const cwd = filePath ? path.dirname(filePath) : process.cwd();
    const gitRoot = await getGitRoot(cwd);
    
    await execAsync(`git reset --hard ${checkpointId}`, { cwd: gitRoot });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('patchHistory:listCheckpoints', async (_event, { filePath }) => {
  try {
    const cwd = filePath ? path.dirname(filePath) : process.cwd();
    const gitRoot = await getGitRoot(cwd);
    
    // Format: Hash|Subject|Timestamp
    const { stdout } = await execAsync('git log --pretty=format:"%H|%s|%at" -n 50', { cwd: gitRoot });
    
    const checkpoints = stdout.split('\n').filter(Boolean).map(line => {
      const [id, name, timestamp] = line.split('|');
      return {
        id,
        name,
        timestamp: parseInt(timestamp, 10) * 1000 // Convert to ms
      };
    });
    
    return { success: true, checkpoints };
  } catch (error) {
    console.error('List checkpoints error:', error);
    return { success: false, error: error.message, checkpoints: [] };
  }
});

// Stubs for other methods to prevent errors
ipcMain.handle('patchHistory:getStatus', async () => ({ success: true, status: null }));
ipcMain.handle('patchHistory:record', async () => ({ success: true }));
ipcMain.handle('patchHistory:undo', async () => ({ success: false, error: 'Not implemented' }));
ipcMain.handle('patchHistory:redo', async () => ({ success: false, error: 'Not implemented' }));
ipcMain.handle('patchHistory:deleteCheckpoint', async () => ({ success: false, error: 'Cannot delete git commits easily' }));
ipcMain.handle('patchHistory:getHistory', async () => ({ success: true, history: [] }));
ipcMain.handle('patchHistory:clear', async () => ({ success: true }));

// IPC Handlers
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: options?.filters || [],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('shell:openExternal', async (_, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('shell:openPath', async (_, filePath) => {
  await shell.openPath(filePath);
});

ipcMain.handle('shell:openInEditor', async (_, { editor, path: filePath }) => {
  try {
    const commands = {
      vscode: `code "${filePath}"`,
      cursor: `cursor "${filePath}"`,
      terminal: process.platform === 'darwin'
        ? `open -a Terminal "${filePath}"`
        : `gnome-terminal --working-directory="${filePath}"`,
    };

    const cmd = commands[editor];
    if (cmd) {
      await execAsync(cmd);
      return { success: true };
    }
    return { success: false, error: 'Unknown editor' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:getPath', (_, name) => {
  return app.getPath(name);
});

// App lifecycle
app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  // Only start server in production mode (not dev mode where server runs separately)
  if (!VITE_DEV_SERVER_URL) {
    await startServer();
  }
  createWindow();
});
