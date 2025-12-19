
import React, { useState } from 'react';
import { Workspace } from '../types';
import { FLEET_CATEGORIES } from '../constants';
import { 
  Home, Plus, ChevronDown, GitBranch, Settings, Database, 
  MessageSquare, Search, MoreHorizontal, X, FolderOpen, 
  Link, Zap, Info
} from 'lucide-react';
import RepoModal, { RepoModalMode, RepoModalPayload } from './RepoModal';

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: (options?: { repoPath?: string; repoUrl?: string; name?: string; branch?: string; baseBranch?: string }) => void;
  onSettingsClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  workspaces, 
  activeWorkspaceId, 
  onSelectWorkspace, 
  onAddWorkspace,
  onSettingsClick
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [repoModalMode, setRepoModalMode] = useState<RepoModalMode>('local');

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

  return (
    <div className="w-[280px] h-full bg-[#0D0D0D] flex flex-col border-r border-white/5 shrink-0 text-[#E5E5E5] z-20 relative">
      {/* Sidebar Header */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded-md cursor-pointer transition-colors group">
          <Home size={16} className="text-white/40 group-hover:text-white" />
          <span className="text-sm font-medium text-white/60 group-hover:text-white">Home</span>
        </div>

        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input 
            type="text" 
            placeholder="Search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 outline-none rounded-lg pl-9 py-1.5 text-xs text-white placeholder:text-white/20 focus:border-white/20 transition-all"
          />
        </div>
      </div>

      {/* Fleet Categories */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6 scrollbar-hide">
        {FLEET_CATEGORIES.map((fleet) => (
          <div key={fleet.id} className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-1 group">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.1em]">{fleet.label}</span>
              <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded transition-all">
                <MoreHorizontal size={14} className="text-white/20" />
              </button>
            </div>

            <button 
              onClick={onAddWorkspace}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-white/30 hover:text-white/50 text-xs font-medium rounded-md hover:bg-white/5 transition-all mb-1"
            >
              <Plus size={14} />
              <span>New workspace</span>
            </button>

            <div className="space-y-0.5">
              {workspaces
                .filter(ws => ws.fleetType === fleet.id)
                .map((ws, idx) => (
                  <button
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws.id)}
                    className={`w-full group relative flex flex-col gap-0.5 px-3 py-3 rounded-lg transition-all text-left border ${
                      activeWorkspaceId === ws.id 
                        ? 'bg-white/10 border-white/10 shadow-lg' 
                        : 'hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <GitBranch size={14} className={`shrink-0 ${activeWorkspaceId === ws.id ? 'text-white/60' : 'text-white/20'}`} />
                        <span className={`text-[13px] font-medium truncate ${activeWorkspaceId === ws.id ? 'text-white' : 'text-white/60'}`}>
                          {ws.branch}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                         <span className="text-[10px] font-bold text-green-500">+{ws.diffs.added}</span>
                         <span className="text-[10px] font-bold text-red-500">-{ws.diffs.removed}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-2 text-[11px] text-white/30">
                        <span className="truncate max-w-[80px]">{ws.location}</span>
                        <span className="w-1 h-1 bg-white/10 rounded-full" />
                        <span className={
                          ws.status === 'Ready to merge' ? 'text-green-500/80' : 
                          ws.status === 'Merge conflicts' ? 'text-red-500/80' : 
                          ws.status === 'Archive' ? 'text-white/20' : ''
                        }>
                          {ws.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/10 font-mono">#{idx + 1}</span>
                    </div>

                    {activeWorkspaceId === ws.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Notes / NEW Callout */}
      <div className="mx-4 mb-4 bg-[#2A1D1D]/40 border border-white/5 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-400">
             <span className="bg-red-400 text-black px-1 rounded text-[8px] font-black">NEW</span>
             Notes
           </div>
           <button className="text-white/20 hover:text-white"><X size={14} /></button>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed">
          Each workspace now has a scratchpad. Share notes with agents using @notes.
        </p>
      </div>

      {/* Sidebar Footer */}
      <div className="mt-auto p-4 border-t border-white/5 space-y-4 bg-black/40">
        <div className="relative">
          <button 
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 rounded-md text-white/40 hover:text-white transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add repository</span>
          </button>
          
              {isAddMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={() => handleOpenRepoModal('local')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <FolderOpen size={14} /> Open project
              </button>
              <button
                onClick={() => handleOpenRepoModal('url')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
              >
                <Link size={14} /> Clone from URL
              </button>
              <button
                onClick={() => onAddWorkspace()}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
              >
                <Zap size={14} /> Quick start
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 text-white/30 hover:text-white transition-colors"><Database size={18} /></button>
            <button className="p-2 text-white/30 hover:text-white transition-colors"><MessageSquare size={18} /></button>
          </div>
          <button onClick={onSettingsClick} className="p-2 text-white/30 hover:text-white transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <RepoModal
        isOpen={isRepoModalOpen}
        mode={repoModalMode}
        onClose={() => setIsRepoModalOpen(false)}
        onCreate={handleCreateRepoWorkspace}
      />
    </div>
  );
};

export default Sidebar;
