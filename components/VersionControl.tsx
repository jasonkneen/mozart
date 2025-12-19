
import React, { useState } from 'react';
import { FileDiff, FileNode } from '../types';
import { 
  Folder, FileCode, GitBranch, ChevronRight, ChevronDown, 
  CheckCircle2, Search, Filter, Plus, Play, Square, ExternalLink
} from 'lucide-react';

const FileItem: React.FC<{ node: FileNode, depth: number }> = ({ node, depth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = node.type === 'directory';

  return (
    <div className="select-none">
      <div 
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 cursor-pointer rounded transition-colors group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => isDir && setIsOpen(!isOpen)}
      >
        <span className="text-white/20 w-3 shrink-0">
          {isDir ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </span>
        <span className={isDir ? 'text-[#8E8E93]' : 'text-blue-400/80 shrink-0'}>
          {isDir ? <Folder size={14} fill="currentColor" fillOpacity={0.1} /> : <FileCode size={14} />}
        </span>
        <span className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors truncate">
          {node.name}
        </span>
      </div>
      {isDir && isOpen && node.children?.map(child => (
        <FileItem key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

interface VersionControlProps {
  diffs: FileDiff[];
  fileTree: FileNode[];
  isLoading: boolean;
}

const VersionControl: React.FC<VersionControlProps> = ({ diffs, fileTree, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'changes' | 'files' | 'review'>('changes');

  return (
    <div className="w-[400px] h-full bg-[#0A0A0A] border-l border-white/5 flex flex-col shrink-0">
      <div className="h-10 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
        <span className="text-xs font-semibold text-white/80">Version control</span>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 hover:bg-white/10 cursor-pointer group">
          <GitBranch size={12} className="text-white/40 group-hover:text-white" />
          <span className="text-[10px] font-bold uppercase text-white/60 group-hover:text-white">Create PR</span>
          <span className="text-[10px] text-white/20 font-mono ml-1">⌘⇧P</span>
          <ChevronDown size={12} className="text-white/20" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Status Banner */}
        <div className="flex items-center justify-between px-4 py-2 bg-green-900/10 border-b border-green-500/20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-tight px-1.5 py-0.5 bg-green-500/10 rounded border border-green-500/20">PR #1432 ↗</span>
            <span className="text-xs font-medium text-green-400/90">Ready to merge</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase rounded shadow-lg transition-all active:scale-95">
            <CheckCircle2 size={12} />
            Merge
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-2 border-b border-white/5">
          <button
            onClick={() => setActiveTab('changes')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'changes' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Changes <span className="opacity-40 ml-1">{diffs.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'files' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
            }`}
          >
            All files
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'review' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Review <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block ml-1 animate-pulse" />
          </button>
          <div className="ml-auto flex items-center">
            <button className="p-1.5 text-white/20 hover:text-white"><Search size={14} /></button>
            <button className="p-1.5 text-white/20 hover:text-white"><Filter size={14} /></button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-hide">
          {activeTab === 'changes' && (
            <div className="space-y-0.5">
              {isLoading && (
                <div className="px-3 py-6 text-xs text-white/40">Loading changes...</div>
              )}
              {!isLoading && diffs.length === 0 && (
                <div className="px-3 py-6 text-xs text-white/40">No changes detected.</div>
              )}
              {!isLoading && diffs.map((change) => (
                <div key={change.path} className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-md cursor-pointer group">
                  <span className="text-[12px] font-mono text-white/60 group-hover:text-white truncate pr-4">
                    {change.path}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {change.added > 0 && <span className="text-[10px] font-bold text-green-500">+{change.added}</span>}
                    {change.removed > 0 && <span className="text-[10px] font-bold text-red-500">-{change.removed}</span>}
                    <div className="w-3 h-3 border border-white/20 rounded-sm flex items-center justify-center">
                       <div className={`w-1.5 h-1.5 rounded-sm ${change.removed > change.added ? 'bg-yellow-500/80' : 'bg-green-500/80'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'files' && (
            <div className="space-y-0.5">
              {isLoading && (
                <div className="px-3 py-6 text-xs text-white/40">Loading file tree...</div>
              )}
              {!isLoading && fileTree.length === 0 && (
                <div className="px-3 py-6 text-xs text-white/40">No files found.</div>
              )}
              {!isLoading && fileTree.map(node => (
                <FileItem key={node.path} node={node} depth={0} />
              ))}
            </div>
          )}
          {activeTab === 'review' && (
             <div className="p-4 space-y-4">
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-2">
                   <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Active Review</h4>
                   <p className="text-sm text-white/80">PR #1432 requires verification of side-panel hooks.</p>
                   <button className="w-full py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-500 transition-all">Start review session</button>
                </div>
             </div>
          )}
        </div>

        {/* Terminal/Run Drawer */}
        <div className="h-[250px] border-t border-white/5 flex flex-col bg-[#050505]">
          <div className="h-10 px-4 flex items-center gap-4 border-b border-white/5 shrink-0">
            <button className="text-[10px] font-bold uppercase tracking-widest text-white border-b-2 border-blue-500 h-full px-2">Run</button>
            <button className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white h-full px-2">Terminal</button>
            <button className="p-1.5 text-white/20 hover:text-white"><Plus size={14} /></button>
            <div className="ml-auto flex items-center gap-2">
               <button className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded text-[10px] font-bold text-white/60 hover:text-white border border-white/10 transition-all active:scale-95">
                 <Play size={10} fill="currentColor" /> Run <span className="opacity-40">⌘R</span>
               </button>
            </div>
          </div>
          <div className="flex-1 bg-black/40 p-4 font-mono text-[11px] leading-relaxed overflow-y-auto">
            <div className="space-y-1 text-white/70">
              <p className="text-blue-400">→ kampala-v3 git:(<span className="text-purple-400">fix-sidepanel-chat-issues</span>) ▮</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionControl;
