
import React, { useState } from 'react';
import { Workspace } from '../types';
import { FLEET_CATEGORIES } from '../constants';
import {
  Home, Plus, ChevronDown, GitBranch, Settings, Database,
  MessageSquare, Search, MoreHorizontal, X, FolderOpen,
  Link, Zap, Info, Github, Terminal, ExternalLink
} from 'lucide-react';
import RepoModal, { RepoModalMode, RepoModalPayload } from './RepoModal';
import GitHubReposBrowser from './GitHubReposBrowser';
import FilePicker from './FilePicker';
import { GitHubRepo } from '../services/githubService';

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: (options?: { repoPath?: string; repoUrl?: string; name?: string; branch?: string; baseBranch?: string }) => void;
  onSettingsClick: () => void;
  onNotesClick?: () => void;
  width?: number;
  onResizeStart?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  onSettingsClick,
  onNotesClick,
  width = 280,
  onResizeStart
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [repoModalMode, setRepoModalMode] = useState<RepoModalMode>('local');
  const [isGitHubBrowserOpen, setIsGitHubBrowserOpen] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [showUpdatesBanner, setShowUpdatesBanner] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workspace: Workspace } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, workspace: Workspace) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, workspace });
  };

  const handleShowInFinder = async () => {
    const wsPath = contextMenu?.workspace.workspacePath || contextMenu?.workspace.repoPath;
    if (!wsPath) return;
    try {
      await fetch(`/api/shell/open-folder?path=${encodeURIComponent(wsPath)}`);
    } catch (e) {
      console.error('Failed to open in Finder:', e);
    }
    setContextMenu(null);
  };

  const handleOpenInTerminal = async () => {
    const wsPath = contextMenu?.workspace.workspacePath || contextMenu?.workspace.repoPath;
    if (!wsPath) return;
    try {
      await fetch(`/api/shell/open-terminal?path=${encodeURIComponent(wsPath)}`);
    } catch (e) {
      console.error('Failed to open terminal:', e);
    }
    setContextMenu(null);
  };

  const handleOpenRepoModal = (mode: RepoModalMode) => {
    setRepoModalMode(mode);
    setIsRepoModalOpen(true);
    setIsAddMenuOpen(false);
  };

  const handleCreateRepoWorkspace = (payload: RepoModalPayload) => {
    onAddWorkspace({
      repoPath: payload.mode === 'local' ? payload.repoPath : undefined,
      repoUrl: payload.mode === 'url' ? payload.repoUrl : undefined,
      name: payload.workspaceName,
      branch: payload.branch,
      baseBranch: payload.baseBranch
    });
    setIsRepoModalOpen(false);
  };

  const handleSelectGitHubRepo = (repo: GitHubRepo) => {
    onAddWorkspace({
      repoUrl: repo.clone_url,
      name: repo.name,
      baseBranch: repo.default_branch
    });
    setIsGitHubBrowserOpen(false);
  };

  const handleSelectLocalFolder = (path: string) => {
    const folderName = path.split('/').pop() || 'workspace';
    onAddWorkspace({
      repoPath: path,
      name: folderName
    });
    setIsFilePickerOpen(false);
  };

  const filteredWorkspaces = (fleetId: string) => {
    return workspaces.filter(ws => {
      if (ws.fleetType !== fleetId) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        ws.name.toLowerCase().includes(query) ||
        ws.branch.toLowerCase().includes(query) ||
        (ws.location && ws.location.toLowerCase().includes(query))
      );
    });
  };

  return (
    <div
      className="h-full bg-surface flex flex-col border-r border-subtle shrink-0 z-20 relative"
      style={{ width, color: 'var(--text-primary)' }}
    >
      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-50 translate-x-0.5"
      />

      {/* Sidebar Header - pt-10 to clear macOS traffic lights */}
      <div className="p-4 pt-10 space-y-4">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/40 transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search workspaces"
            className="w-full bg-white/5 border border-white/5 outline-none rounded-lg pl-9 py-1.5 text-sm text-white placeholder:text-white/20 focus:border-white/20 focus:bg-white/10 transition-all"
          />
        </div>
      </div>

      {/* Fleet Categories */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6 scrollbar-hide">
        {FLEET_CATEGORIES.map((fleet, fleetIdx) => {
          const fleetWorkspaces = filteredWorkspaces(fleet.id);
          // Always show first fleet category, hide others if empty
          if (fleetIdx > 0 && fleetWorkspaces.length === 0) return null;

          return (
            <div key={fleet.id} className="space-y-1">
              <div className="flex items-center justify-between px-2 mb-2 group">
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">{fleet.label}</span>
                {/* New workspace button - inline with header */}
                {!searchQuery && fleetIdx === 0 && (
                  <button
                    onClick={() => handleOpenRepoModal('local')}
                    aria-label="Create new workspace"
                    className="flex items-center gap-1.5 px-2 py-1 text-white/40 hover:text-white text-xs font-medium rounded-lg hover:bg-white/10 transition-all"
                  >
                    <Plus size={14} />
                    <span>New</span>
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {fleetWorkspaces.map((ws, idx) => (
                  <button
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws.id)}
                    onContextMenu={(e) => handleContextMenu(e, ws)}
                    aria-label={`Switch to workspace: ${ws.name || ws.branch}`}
                    aria-current={activeWorkspaceId === ws.id ? 'true' : undefined}
                    className={`w-full group relative flex flex-col gap-1 px-3 py-2.5 rounded-lg transition-all text-left border ${
                      activeWorkspaceId === ws.id
                        ? 'bg-white/10 border-white/10 shadow-lg'
                        : 'hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                        <GitBranch size={14} className={`shrink-0 ${activeWorkspaceId === ws.id ? 'text-white' : 'text-white/40'}`} />
                        <span className={`text-[13px] font-medium truncate ${activeWorkspaceId === ws.id ? 'text-white' : 'text-white/70'}`}>
                          {ws.branch}
                        </span>
                      </div>
                      {idx < 6 && (
                        <span className={`text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity ${activeWorkspaceId === ws.id ? 'text-white/40' : 'text-white/20'}`}>
                          ⌘{idx + 1}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[11px] text-white/30 pl-5.5">
                      <span className="truncate max-w-[100px]">{ws.location || 'Local'}</span>
                      <span className="text-white/10">•</span>
                      <span>{ws.timeAgo || 'now'}</span>
                    </div>

                    {activeWorkspaceId === ws.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer with Updates Banner */}
      <div className="relative">
        {/* Updates banner - slides up from behind footer */}
        <div
          className={`absolute left-3 right-3 bg-elevated border border-subtle rounded-xl p-3 shadow-lg transition-all duration-300 ease-out z-0 ${
            showUpdatesBanner
              ? 'bottom-full mb-2 opacity-100 translate-y-0'
              : 'bottom-full mb-2 opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowUpdatesBanner(false); }}
            className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Dismiss updates banner"
          >
            <X size={14} className="text-white/40 hover:text-white" />
          </button>
          <div
            onClick={onNotesClick}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Updates</span>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed pr-6">
              Scratchpad available. Share notes with @notes.
            </p>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="p-3 border-t border-subtle bg-surface relative z-10">
          <div className="flex flex-col gap-1">
            <div className="relative">
               <button
                 onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                 aria-expanded={isAddMenuOpen}
                 aria-haspopup="menu"
                 aria-label="Add repository menu"
                 className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors group"
               >
                 <Plus size={16} className="text-white/20 group-hover:text-white transition-colors" />
                 <span className="text-sm font-medium">Add repository</span>
               </button>

               {isAddMenuOpen && (
                <div role="menu" aria-label="Repository options" className="absolute bottom-full left-0 mb-2 w-full bg-elevated border border-default rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsFilePickerOpen(true);
                      setIsAddMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <FolderOpen size={14} /> Open project
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => handleOpenRepoModal('url')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
                  >
                    <Link size={14} /> Clone from URL
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsGitHubBrowserOpen(true);
                      setIsAddMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
                  >
                    <Github size={14} /> Browse GitHub
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => handleOpenRepoModal('local')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
                  >
                    <Zap size={14} /> Quick start
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onSettingsClick}
              aria-label="Open settings"
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors group"
            >
              <Settings size={16} className="text-white/20 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>

      <RepoModal
        isOpen={isRepoModalOpen}
        mode={repoModalMode}
        onClose={() => setIsRepoModalOpen(false)}
        onCreate={handleCreateRepoWorkspace}
      />

      <GitHubReposBrowser
        isOpen={isGitHubBrowserOpen}
        onClose={() => setIsGitHubBrowserOpen(false)}
        onSelectRepo={handleSelectGitHubRepo}
      />

      <FilePicker
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelect={handleSelectLocalFolder}
        mode="directory"
        title="Select Project Folder"
      />

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setContextMenu(null)}
            aria-hidden="true"
          />
          <div
            role="menu"
            aria-label="Workspace actions"
            className="fixed z-[101] bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in-95"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              role="menuitem"
              onClick={handleShowInFinder}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <FolderOpen size={14} />
              Show in Finder
            </button>
            <button
              role="menuitem"
              onClick={handleOpenInTerminal}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Terminal size={14} />
              Open in Terminal
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
