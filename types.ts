
export enum ThinkingLevel {
  None = 'None',
  Think = 'Think',
  Megathink = 'Megathink'
}

export type TraceType = 'Thinking' | 'Lint' | 'Edit' | 'Bash' | 'Read' | 'Plan';

export type ToolTrace = {
  type: TraceType;
  content: string;
  command?: string;
  diff?: { added: number; removed: number };
  status?: 'completed' | 'running' | 'error';
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  level?: ThinkingLevel;
  traces?: ToolTrace[];
  plan?: {
    title: string;
    description: string;
    steps: { label: string; details: string; completed: boolean }[];
    proposedChanges?: string;
  };
  prInfo?: {
    id: string;
    url: string;
    status: 'Ready to merge' | 'Merge conflicts' | 'Draft';
    files: { path: string; added: number; removed: number; type: string }[];
  };
};

export type WorkspaceStatus = 'idle' | 'running' | 'Ready to merge' | 'Merge conflicts' | 'Archive' | 'Initializing...';

export type Workspace = {
  id: string;
  name: string;
  branch: string;
  location: string;
  timeAgo: string;
  status: WorkspaceStatus;
  fleetType: 'Nanobrowser' | 'Plans' | 'Canvas' | 'Search';
  repo: string;
  diffs: { added: number; removed: number };
  unread?: boolean;
};

export type FileNode = {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  path: string;
  extension?: string;
};

export type Tab = {
  id: string;
  title: string;
  type: 'chat' | 'file';
  active?: boolean;
};
