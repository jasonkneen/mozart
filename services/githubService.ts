// GitHub Service for repository integration

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
  fork: boolean;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  pushed_at: string;
};

type GitHubUser = {
  login: string;
  name: string;
  avatar_url: string;
  email: string | null;
};

const API_BASE = '/api/github';

export const githubService = {
  // Check if gh CLI is authenticated
  async checkAuth(): Promise<{ authenticated: boolean; user?: GitHubUser }> {
    try {
      const response = await fetch(`${API_BASE}/auth/status`);
      if (!response.ok) return { authenticated: false };
      const data = await response.json();
      return data;
    } catch {
      return { authenticated: false };
    }
  },

  // Get user's repositories
  async getRepos(options?: { sort?: 'updated' | 'pushed' | 'name'; limit?: number }): Promise<GitHubRepo[]> {
    const params = new URLSearchParams();
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', options.limit.toString());

    const response = await fetch(`${API_BASE}/repos?${params}`);
    if (!response.ok) throw new Error('Failed to fetch repos');
    const data = await response.json();
    return data.repos;
  },

  // Get starred repositories
  async getStarredRepos(limit = 10): Promise<GitHubRepo[]> {
    const response = await fetch(`${API_BASE}/starred?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch starred repos');
    const data = await response.json();
    return data.repos;
  },

  // Search repositories
  async searchRepos(query: string): Promise<GitHubRepo[]> {
    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search repos');
    const data = await response.json();
    return data.repos;
  },

  // Get repository info
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const response = await fetch(`${API_BASE}/repos/${owner}/${repo}`);
    if (!response.ok) throw new Error('Failed to fetch repo');
    return response.json();
  },

  // Clone a repository
  async cloneRepo(repoUrl: string, targetPath?: string): Promise<{ path: string }> {
    const response = await fetch(`${API_BASE}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl, targetPath }),
    });
    if (!response.ok) throw new Error('Failed to clone repo');
    return response.json();
  },
};

export type { GitHubRepo, GitHubUser };
