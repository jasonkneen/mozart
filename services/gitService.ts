import { FileDiff, FileNode, Workspace } from '../types';

type CreateWorkspaceInput = {
  name?: string;
  branch?: string;
  location?: string;
  repo?: string;
  repoPath?: string;
  repoUrl?: string;
  baseBranch?: string;
  fleetType?: Workspace['fleetType'];
};

type BranchExistsInput = {
  repoPath?: string;
  repoUrl?: string;
  branch: string;
};

const API_BASE = (import.meta as { env?: Record<string, string> }).env?.VITE_CONDUCTOR_API_BASE || '/api';
const DEFAULT_REPO_PATH = (import.meta as { env?: Record<string, string> }).env?.VITE_DEFAULT_REPO_PATH || '';

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const gitService = {
  async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    const payload = {
      name: input.name,
      branch: input.branch,
      repoPath: input.repoPath || DEFAULT_REPO_PATH,
      repoUrl: input.repoUrl,
      baseBranch: input.baseBranch
    };
    return request<Workspace>('/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async getWorkspaceDiffs(workspaceId: string): Promise<FileDiff[]> {
    const payload = await request<{ diffs: FileDiff[] }>(`/workspaces/${workspaceId}/diffs`);
    return payload.diffs;
  },

  async getWorkspaceFileTree(workspaceId: string): Promise<FileNode[]> {
    const payload = await request<{ fileTree: FileNode[] }>(`/workspaces/${workspaceId}/files`);
    return payload.fileTree;
  },

  async branchExists(input: BranchExistsInput): Promise<boolean> {
    if (!input.branch.trim()) return true;
    const payload = await request<{ exists: boolean }>('/repos/branch-exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoPath: input.repoPath || DEFAULT_REPO_PATH,
        repoUrl: input.repoUrl,
        branch: input.branch
      })
    });
    return payload.exists;
  }
};
