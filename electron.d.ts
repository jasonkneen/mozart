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

export interface LSPHoverResult {
  contents: string[];
  range?: { start: { line: number; character: number }; end: { line: number; character: number } };
}
export interface LSPCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  insertText?: string;
}
export interface LSPLocation {
  uri: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
}
export interface LSPDiagnostic {
  message: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  severity?: number;
  source?: string;
}

interface PatchHistoryAPI {
  getStatus: (filePath: string) => Promise<{ success: boolean; status?: any; error?: string }>;
  record: (filePath: string, beforeContent: string, afterContent: string, description: string, options?: any) => Promise<{ success: boolean; error?: string }>;
  undo: (filePath: string) => Promise<{ success: boolean; restoredContent?: string; error?: string }>;
  redo: (filePath: string) => Promise<{ success: boolean; restoredContent?: string; error?: string }>;
  createCheckpoint: (filePath: string, name?: string) => Promise<{ success: boolean; checkpointId?: string; error?: string }>;
  restoreCheckpoint: (filePath: string, checkpointId: string) => Promise<{ success: boolean; error?: string }>;
  listCheckpoints: (filePath: string) => Promise<{ success: boolean; checkpoints?: { id: string; name: string; timestamp: number }[]; error?: string }>;
  deleteCheckpoint: (filePath: string, checkpointId: string) => Promise<{ success: boolean; error?: string }>;
  getHistory: (filePath: string, options?: any) => Promise<{ success: boolean; history?: any[]; error?: string }>;
  clear: (filePath: string) => Promise<{ success: boolean; error?: string }>;
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
  patchHistory: PatchHistoryAPI;
  mcp: {
    connect: (config: any) => Promise<{ success: boolean; error?: string; capabilities?: any }>;
    disconnect: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
    listTools: (connectionId: string) => Promise<{ success: boolean; tools?: any[]; error?: string }>;
    listResources: (connectionId: string) => Promise<{ success: boolean; resources?: any[]; error?: string }>;
    listPrompts: (connectionId: string) => Promise<{ success: boolean; prompts?: any[]; error?: string }>;
    callTool: (params: { serverId: string; toolName: string; arguments: any }) => Promise<{ success: boolean; result?: any; content?: any[]; error?: string }>;
    onEvent: (callback: (event: any) => void) => () => void;
    scoreToolRelevance?: (tools: any[], context: any) => Promise<any[]>;
    trackToolUsage?: (serverId: string, toolName: string, executionTime: number, success: boolean) => Promise<void>;
    getToolUsageStats?: (serverId: string, toolName: string) => Promise<any>;
    getIndexHealth?: (projectPath?: string) => Promise<any>;
    getConnections?: () => Promise<{ success: boolean; connections?: { id: string; status: string }[]; error?: string }>;
  };
  
  // Added missing properties
  git: any;
  files: any;
  aiSdk: any;
  oauth: any;
  codex: any;
  voice: any;
  tabdata: any;
  lsp: any;
  mgrep: any;
  selectorAgent: any;
  fileWatcher: any;
  agentSdk: any;
  pty: any;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
