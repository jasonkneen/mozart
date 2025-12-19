import React, { useEffect, useState } from 'react';
import { X, FolderOpen, Link2, Search } from 'lucide-react';
import { gitService } from '../services/gitService';
import FilePicker from './FilePicker';

export type RepoModalMode = 'local' | 'url';

export type RepoModalPayload = {
  mode: RepoModalMode;
  repoPath?: string;
  repoUrl?: string;
  workspaceName?: string;
  branch?: string;
  baseBranch?: string;
};

interface RepoModalProps {
  isOpen: boolean;
  mode: RepoModalMode;
  onClose: () => void;
  onCreate: (payload: RepoModalPayload) => void;
}

const RepoModal: React.FC<RepoModalProps> = ({ isOpen, mode, onClose, onCreate }) => {
  const [repoPath, setRepoPath] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [branch, setBranch] = useState('');
  const [baseBranch, setBaseBranch] = useState('');
  const [baseBranchError, setBaseBranchError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    setRepoPath('');
    setRepoUrl('');
    setWorkspaceName('');
    setBranch('');
    setBaseBranch('');
    setBaseBranchError('');
    setIsValidating(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const isLocal = mode === 'local';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBaseBranchError('');

    const normalizedRepoPath = repoPath.trim();
    const normalizedRepoUrl = repoUrl.trim();

    if (baseBranch.trim() && (normalizedRepoPath || normalizedRepoUrl)) {
      setIsValidating(true);
      try {
        const exists = await gitService.branchExists({
          repoPath: mode === 'local' ? normalizedRepoPath : undefined,
          repoUrl: mode === 'url' ? normalizedRepoUrl : undefined,
          branch: baseBranch.trim()
        });
        if (!exists) {
          setBaseBranchError('Base branch not found. Check the branch name.');
          return;
        }
      } finally {
        setIsValidating(false);
      }
    }

    onCreate({
      mode,
      repoPath: normalizedRepoPath || undefined,
      repoUrl: normalizedRepoUrl || undefined,
      workspaceName: workspaceName.trim() || undefined,
      branch: branch.trim() || undefined,
      baseBranch: baseBranch.trim() || undefined
    });
    setRepoPath('');
    setRepoUrl('');
    setWorkspaceName('');
    setBranch('');
    setBaseBranch('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] rounded-2xl border border-white/10 bg-[#101010] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            {isLocal ? <FolderOpen size={16} /> : <Link2 size={16} />}
            {isLocal ? 'Open local repo' : 'Clone from URL'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {isLocal ? (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Local repo path
              </label>
              <div className="flex gap-2">
                <input
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  placeholder="/Users/you/code/my-repo"
                  className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsFilePickerOpen(true)}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  title="Browse..."
                >
                  <Search size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Repo URL
              </label>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Workspace name (optional)
              </label>
              <input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Feature task"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Branch (optional)
              </label>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="ai/new-task"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Base branch (optional)
            </label>
            <input
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              placeholder="main"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 outline-none"
            />
            {baseBranchError && (
              <p className="text-[11px] text-red-400">{baseBranchError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-white/40 hover:text-white/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/10 text-white/80 hover:text-white hover:bg-white/20 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>

      <FilePicker
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelect={(path) => {
          setRepoPath(path);
          setIsFilePickerOpen(false);
        }}
        mode="directory"
        title="Select Repository Folder"
      />
    </div>
  );
};

export default RepoModal;
