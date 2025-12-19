"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openDirectory: () => electron.ipcRenderer.invoke("dialog:openDirectory"),
  openFile: (options) => electron.ipcRenderer.invoke("dialog:openFile", options),
  openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", url),
  openPath: (path) => electron.ipcRenderer.invoke("shell:openPath", path),
  openInEditor: (editor, path) => electron.ipcRenderer.invoke("shell:openInEditor", { editor, path }),
  getPath: (name) => electron.ipcRenderer.invoke("app:getPath", name),
  platform: process.platform,
  isElectron: true,
  claudeCode: {
    startSession: (options) => electron.ipcRenderer.invoke("claude-code:start-session", options),
    sendMessage: (text) => electron.ipcRenderer.invoke("claude-code:send-message", text),
    isActive: () => electron.ipcRenderer.invoke("claude-code:is-active"),
    stop: () => electron.ipcRenderer.invoke("claude-code:stop"),
    reset: () => electron.ipcRenderer.invoke("claude-code:reset"),
    onTextChunk: (callback) => {
      electron.ipcRenderer.on("claude-code:text-chunk", (_event, text) => callback(text));
      return () => electron.ipcRenderer.removeAllListeners("claude-code:text-chunk");
    },
    onToolUse: (callback) => {
      electron.ipcRenderer.on("claude-code:tool-use", (_event, toolUse) => callback(toolUse));
      return () => electron.ipcRenderer.removeAllListeners("claude-code:tool-use");
    },
    onToolResult: (callback) => {
      electron.ipcRenderer.on("claude-code:tool-result", (_event, result) => callback(result));
      return () => electron.ipcRenderer.removeAllListeners("claude-code:tool-result");
    },
    onComplete: (callback) => {
      electron.ipcRenderer.on("claude-code:complete", () => callback());
      return () => electron.ipcRenderer.removeAllListeners("claude-code:complete");
    },
    onError: (callback) => {
      electron.ipcRenderer.on("claude-code:error", (_event, error) => callback(error));
      return () => electron.ipcRenderer.removeAllListeners("claude-code:error");
    }
  }
});
window.addEventListener("DOMContentLoaded", () => {
  console.log("Mozart Desktop ready");
});
