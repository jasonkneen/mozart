import { FileDiff, FileNode, Workspace } from '../types';
import { mockDiffs, mockFileTree } from './mockData';

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    try {
      const payload = {
        name: input.name,
        branch: input.branch,
        repoPath: input.repoPath || DEFAULT_REPO_PATH,
        repoUrl: input.repoUrl,
        baseBranch: input.baseBranch
      };
      const workspace = await request<Workspace>('/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return workspace;
    } catch (error) {
      console.warn('Falling back to mock workspace creation', error);
      await sleep(200);
      const id = `ws-${Date.now()}`;
      const branch = input.branch || `ai/task-${Math.floor(Math.random() * 1000)}`;
      const now = Date.now();
      return {
        id,
        name: input.name || 'New Agent Task',
        branch,
        location: input.location || 'local-env',
        timeAgo: 'just now',
        status: 'idle',
        fleetType: input.fleetType || 'Nanobrowser',
        repo: input.repo || 'conductor',
        diffs: { added: 0, removed: 0 },
        createdAt: now,
        updatedAt: now,
        baseBranch: input.baseBranch
      };
    }
  },

  async getWorkspaceDiffs(_workspaceId: string): Promise<FileDiff[]> {
    try {
      const payload = await request<{ diffs: FileDiff[] }>(`/workspaces/${_workspaceId}/diffs`);
      return payload.diffs;
    } catch (error) {
      console.warn('Falling back to mock diffs', error);
      await sleep(250);
      return mockDiffs;
    }
  },

  async getWorkspaceFileTree(_workspaceId: string): Promise<FileNode[]> {
    try {
      const payload = await request<{ fileTree: FileNode[] }>(`/workspaces/${_workspaceId}/files`);
      return payload.fileTree;
    } catch (error) {
      console.warn('Falling back to mock file tree', error);
      await sleep(150);
      return mockFileTree;
    }
  },

  async branchExists(input: BranchExistsInput): Promise<boolean> {
    if (!input.branch.trim()) return true;
    try {
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
    } catch (error) {
      console.warn('Falling back to assumed branch existence', error);
      return true;
    }
  }
};
