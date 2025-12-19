interface ClaudeCodeAPI {
  startSession: (options: { prompt: string; model?: 'fast' | 'smart'; cwd?: string }) => Promise<{ success: boolean; error?: string }>;
  sendMessage: (text: string) => Promise<{ success: boolean; error?: string }>;
  isActive: () => Promise<{ active: boolean }>;
  stop: () => Promise<{ success: boolean; error?: string }>;
  reset: () => Promise<{ success: boolean; error?: string }>;
  onTextChunk: (callback: (text: string) => void) => () => void;
  onToolUse: (callback: (toolUse: { id: string; name: string; input: Record<string, unknown> }) => void) => () => void;
  onToolResult: (callback: (result: { toolUseId: string; content: string; isError: boolean }) => void) => () => void;
  onComplete: (callback: () => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;
}

interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;

  openExternal: (url: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  openInEditor: (editor: string, path: string) => Promise<{ success: boolean; error?: string }>;

  getPath: (name: string) => Promise<string>;

  platform: NodeJS.Platform;
  isElectron: true;

  claudeCode: ClaudeCodeAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
