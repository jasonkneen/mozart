
export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
}

export interface MCPServerCapabilities {
  prompts?: Record<string, any>;
  resources?: Record<string, any>;
  tools?: Record<string, any>;
  logging?: Record<string, any>;
}

export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  error?: string;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  lastConnected?: number;
  capabilities?: MCPServerCapabilities;
}

export interface MCPToolCall {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
  content?: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
}

export interface MCPEvent {
  type: 'connecting' | 'connected' | 'disconnected' | 'error' | 'tools-changed' | 'resources-changed' | 'prompts-changed';
  serverId: string;
  timestamp: number;
  data?: any;
}

export interface SmartMCPContext {
  query: string;
  fileContext?: string[];
  history?: any[];
}

export interface ScoredMCPTool extends MCPTool {
  serverId: string;
  relevanceScore: number;
}

export interface ToolUsageStats {
  callCount: number;
  successRate: number;
  avgExecutionTime: number;
  lastUsed: number;
}

export interface IndexHealthStatus {
  ready: boolean;
  indexing: boolean;
  totalChunks: number;
  totalFiles: number;
  healthPercentage: number;
}
