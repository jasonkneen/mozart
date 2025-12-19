import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),

  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  openInEditor: (editor, path) => ipcRenderer.invoke('shell:openInEditor', { editor, path }),

  getPath: (name) => ipcRenderer.invoke('app:getPath', name),

  platform: process.platform,
  isElectron: true,

  claudeCode: {
    startSession: (options) => ipcRenderer.invoke('claude-code:start-session', options),
    sendMessage: (text) => ipcRenderer.invoke('claude-code:send-message', text),
    isActive: () => ipcRenderer.invoke('claude-code:is-active'),
    stop: () => ipcRenderer.invoke('claude-code:stop'),
    reset: () => ipcRenderer.invoke('claude-code:reset'),
    onTextChunk: (callback) => {
      ipcRenderer.on('claude-code:text-chunk', (_event, text) => callback(text))
      return () => ipcRenderer.removeAllListeners('claude-code:text-chunk')
    },
    onToolUse: (callback) => {
      ipcRenderer.on('claude-code:tool-use', (_event, toolUse) => callback(toolUse))
      return () => ipcRenderer.removeAllListeners('claude-code:tool-use')
    },
    onToolResult: (callback) => {
      ipcRenderer.on('claude-code:tool-result', (_event, result) => callback(result))
      return () => ipcRenderer.removeAllListeners('claude-code:tool-result')
    },
    onComplete: (callback) => {
      ipcRenderer.on('claude-code:complete', () => callback())
      return () => ipcRenderer.removeAllListeners('claude-code:complete')
    },
    onError: (callback) => {
      ipcRenderer.on('claude-code:error', (_event, error) => callback(error))
      return () => ipcRenderer.removeAllListeners('claude-code:error')
    },
  },
});

// Notify when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('Mozart Desktop ready');
});
