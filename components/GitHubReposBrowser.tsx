
import React, { useState, useEffect } from 'react';
import {
  Github, Search, Star, GitFork, Lock, Globe, X,
  RefreshCw, ChevronRight, Clock, Code
} from 'lucide-react';
import { githubService, GitHubRepo, GitHubUser } from '../services/githubService';

interface GitHubReposBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRepo: (repo: GitHubRepo) => void;
}

const GitHubReposBrowser: React.FC<GitHubReposBrowserProps> = ({
  isOpen,
  onClose,
  onSelectRepo
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'starred' | 'search'>('recent');
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [starredRepos, setStarredRepos] = useState<GitHubRepo[]>([]);
  const [searchResults, setSearchResults] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    checkAuth();
  }, [isOpen]);

  const checkAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await githubService.checkAuth();
      setIsAuthenticated(result.authenticated);
      if (result.authenticated && result.user) {
        setUser(result.user);
        loadRepos();
      }
    } catch (err) {
      setError('Failed to check GitHub authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRepos = async () => {
    setIsLoading(true);
    try {
      const [recentRepos, starred] = await Promise.all([
        githubService.getRepos({ sort: 'pushed', limit: 20 }),
        githubService.getStarredRepos(10)
      ]);
      setRepos(recentRepos);
      setStarredRepos(starred);
    } catch (err) {
      setError('Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const results = await githubService.searchRepos(searchQuery);
      setSearchResults(results);
      setActiveTab('search');
    } catch (err) {
      setError('Failed to search repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const currentRepos = activeTab === 'recent' ? repos :
                       activeTab === 'starred' ? starredRepos :
                       searchResults;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-[800px] max-h-[80vh] bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github size={20} className="text-white" />
            <h2 className="text-lg font-bold text-white">GitHub Repositories</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <Github size={48} className="text-white/20 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Connect GitHub</h3>
            <p className="text-sm text-white/40 text-center max-w-md mb-6">
              Authenticate with GitHub CLI to browse and clone your repositories.
            </p>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-white/60 mb-2">Run in terminal:</p>
              <code className="text-sm text-green-400 font-mono">gh auth login</code>
            </div>
            <button
              onClick={checkAuth}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Check Again
            </button>
          </div>
        ) : (
          <>
            {/* User Info & Search */}
            <div className="px-6 py-4 border-b border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user?.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{user?.name || user?.login}</p>
                    <p className="text-xs text-white/40">@{user?.login}</p>
                  </div>
                </div>
                <button
                  onClick={loadRepos}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              <form onSubmit={handleSearch} className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search GitHub repositories..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
                />
              </form>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 py-2 border-b border-white/5">
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'recent' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Clock size={12} /> Recent
              </button>
              <button
                onClick={() => setActiveTab('starred')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'starred' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Star size={12} /> Starred
              </button>
              {searchResults.length > 0 && (
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'search' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <Search size={12} /> Results ({searchResults.length})
                </button>
              )}
            </div>

            {/* Repo List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
              {error && (
                <div className="p-4 text-center text-red-400 text-sm">{error}</div>
              )}

              {isLoading && (
                <div className="p-8 text-center text-white/40 text-sm">Loading...</div>
              )}

              {!isLoading && !error && currentRepos.length === 0 && (
                <div className="p-8 text-center text-white/40 text-sm">
                  {activeTab === 'search' ? 'No repositories found' : 'No repositories'}
                </div>
              )}

              {!isLoading && !error && currentRepos.map((repo) => (
                <div
                  key={repo.id || repo.full_name}
                  onClick={() => onSelectRepo(repo)}
                  className="flex items-start justify-between p-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {repo.private ? (
                        <Lock size={14} className="text-yellow-500/60 shrink-0" />
                      ) : (
                        <Globe size={14} className="text-white/20 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-white truncate">
                        {repo.full_name}
                      </span>
                      {repo.fork && (
                        <GitFork size={12} className="text-white/30 shrink-0" />
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-white/40 mt-1 line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      {repo.language && (
                        <span className="flex items-center gap-1 text-[10px] text-white/30">
                          <Code size={10} /> {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-white/30">
                        <Star size={10} /> {repo.stargazers_count}
                      </span>
                      <span className="text-[10px] text-white/20">
                        Updated {formatDate(repo.updated_at || repo.pushed_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 shrink-0 ml-4" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GitHubReposBrowser;
