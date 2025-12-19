import { ipcMain, dialog, shell, app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
const require$1 = createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const claudeSessionPath = path.join(__dirname$1, "..", "electron", "claude-session.cjs");
const claudeSession = require$1(claudeSessionPath);
const execAsync = promisify(exec);
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
let serverProcess = null;
ipcMain.handle("claude-code:start-session", async (_event, { prompt, model, cwd }) => {
  try {
    claudeSession.startStreamingSession({
      prompt,
      model: model || "smart",
      cwd: cwd || process.cwd(),
      onTextChunk: (text) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send("claude-code:text-chunk", text);
        }
      },
      onToolUse: (toolUse) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send("claude-code:tool-use", toolUse);
        }
      },
      onToolResult: (result) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send("claude-code:tool-result", result);
        }
      },
      onComplete: () => {
        if (win && !win.isDestroyed()) {
          win.webContents.send("claude-code:complete");
        }
      },
      onError: (error) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send("claude-code:error", error);
        }
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle("claude-code:send-message", async (_event, text) => {
  try {
    await claudeSession.sendMessage(text);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle("claude-code:is-active", async () => {
  return { active: claudeSession.isSessionActive() };
});
ipcMain.handle("claude-code:stop", async () => {
  try {
    await claudeSession.interruptCurrentResponse();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle("claude-code:reset", async () => {
  try {
    await claudeSession.resetSession();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1e3,
    minWidth: 1200,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#050505",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
async function startServer() {
  const serverPath = path.join(process.env.APP_ROOT, "server", "index.js");
  serverProcess = spawn("node", [serverPath], {
    cwd: process.env.APP_ROOT,
    env: {
      ...process.env,
      NODE_ENV: "production"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  serverProcess.stdout.on("data", (data) => {
    console.log(`[Server] ${data}`);
  });
  serverProcess.stderr.on("data", (data) => {
    console.error(`[Server Error] ${data}`);
  });
  serverProcess.on("close", (code) => {
    console.log(`[Server] Process exited with code ${code}`);
  });
  await new Promise((resolve) => setTimeout(resolve, 1e3));
}
ipcMain.handle("dialog:openDirectory", async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"]
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle("dialog:openFile", async (_, options) => {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: (options == null ? void 0 : options.filters) || []
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle("shell:openExternal", async (_, url) => {
  await shell.openExternal(url);
});
ipcMain.handle("shell:openPath", async (_, filePath) => {
  await shell.openPath(filePath);
});
ipcMain.handle("shell:openInEditor", async (_, { editor, path: filePath }) => {
  try {
    const commands = {
      vscode: `code "${filePath}"`,
      cursor: `cursor "${filePath}"`,
      terminal: process.platform === "darwin" ? `open -a Terminal "${filePath}"` : `gnome-terminal --working-directory="${filePath}"`
    };
    const cmd = commands[editor];
    if (cmd) {
      await execAsync(cmd);
      return { success: true };
    }
    return { success: false, error: "Unknown editor" };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle("app:getPath", (_, name) => {
  return app.getPath(name);
});
app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(async () => {
  if (!VITE_DEV_SERVER_URL) {
    await startServer();
  }
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
