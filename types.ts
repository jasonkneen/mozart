
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
  repoId?: string;
  createdAt?: number;
  updatedAt?: number;
  archived?: boolean;
  repoPath?: string;
  workspacePath?: string;
  baseBranch?: string;
  notes?: string;
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
  type: 'chat' | 'file' | 'terminal' | 'notes' | 'diff';
  active?: boolean;
  filePath?: string;
  language?: string;
  isDirty?: boolean;
  diffPath?: string;
};

export type RepoProvider = 'github' | 'git' | 'local' | 'unknown';

export type Repo = {
  id: string;
  name: string;
  path: string;
  remoteUrl?: string;
  defaultBranch: string;
  provider?: RepoProvider;
};

export type Branch = {
  name: string;
  ref?: string;
  isDefault?: boolean;
  upstream?: string;
};

export type AgentProvider = 'claude' | 'codex' | 'custom';

export type Agent = {
  id: string;
  name: string;
  provider: AgentProvider;
  model: string;
  reasoningLevel?: ThinkingLevel;
};

export type Session = {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  tabId?: string;
};

export type DiffHunk = {
  header: string;
  lines: string[];
};

export type FileDiff = {
  path: string;
  added: number;
  removed: number;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks?: DiffHunk[];
};

export type ScriptRunType = 'setup' | 'run' | 'archive';
export type ScriptRunStatus = 'queued' | 'running' | 'success' | 'error';

export type ScriptRun = {
  id: string;
  workspaceId: string;
  type: ScriptRunType;
  command: string;
  status: ScriptRunStatus;
  startedAt?: number;
  completedAt?: number;
  exitCode?: number;
  output?: string;
};

export type CheckpointType = 'turn' | 'git';

export type Checkpoint = {
  id: string;
  workspaceId: string;
  type: CheckpointType;
  createdAt: number;
  messageId?: string;
  summary?: string;
};

export type PullRequestStatus = 'Draft' | 'Open' | 'Merged' | 'Closed' | 'Ready to merge' | 'Merge conflicts';

export type PullRequest = {
  id: string;
  number?: number;
  title: string;
  status: PullRequestStatus;
  url?: string;
};

export type CodeComment = {
  id: string;
  filePath: string;
  line: number;
  content: string;
  createdAt: number;
};
