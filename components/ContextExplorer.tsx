
import React, { useState } from 'react';
import { MOCK_FILE_TREE } from '../constants';
import { FileNode } from '../types';
import { Folder, FileCode, GitBranch, Terminal as TerminalIcon, Search, ChevronRight, ChevronDown, CheckCircle2, GitCommit, Send } from 'lucide-react';

const FileItem: React.FC<{ node: FileNode, depth: number }> = ({ node, depth }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isDir = node.type === 'directory';

  return (
    <div className="select-none">
      <div 
        className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 cursor-pointer rounded transition-colors group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => isDir && setIsOpen(!isOpen)}
      >
        <span className="text-white/20">
          {isDir ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5" />}
        </span>
        <span className={isDir ? 'text-blue-400/80' : 'text-white/60'}>
          {isDir ? <Folder size={14} /> : <FileCode size={14} />}
        </span>
        <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
          {node.name}
        </span>
      </div>
      {isDir && isOpen && node.children?.map(child => (
        <FileItem key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

const ContextExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'files' | 'changes' | 'terminal'>('files');
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    setIsCommitting(true);
    // Simulate commit delay
    setTimeout(() => {
      console.log(`Committed: ${commitMessage}`);
      setCommitMessage('');
      setIsCommitting(false);
      // In a real app, this would trigger a git commit in the worktree
    }, 800);
  };

  return (
    <div className="w-[400px] h-full glass border-l border-white/10 flex flex-col shrink-0">
      <div className="flex border-b border-white/10">
        {(['files', 'changes', 'terminal'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab ? 'text-white border-blue-500 bg-white/5' : 'text-white/30 border-transparent hover:text-white/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-black/20">
        {activeTab === 'files' && (
          <div className="p-4 space-y-1">
            <div className="flex items-center gap-2 mb-4 px-2 py-1.5 bg-white/5 rounded border border-white/5">
              <Search size={14} className="text-white/30" />
              <input 
                type="text" 
                placeholder="Find file..." 
                className="bg-transparent border-none outline-none text-xs w-full text-white placeholder:text-white/20"
              />
            </div>
            {MOCK_FILE_TREE.map(node => (
              <FileItem key={node.path} node={node} depth={0} />
            ))}
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="p-4 flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/40 uppercase tracking-widest">Staged Changes</span>
              <button className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase rounded border border-green-500/20 hover:bg-green-500/20 transition-all">
                <CheckCircle2 size={12} />
                Create PR
              </button>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto">
              <div className="glass p-3 rounded-lg border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-blue-400">src/components/Sidebar.tsx</span>
                  <span className="text-[10px] text-green-500">+12 -4</span>
                </div>
                <div className="text-[10px] font-mono text-white/20 whitespace-pre overflow-hidden bg-black/40 p-2 rounded">
                  <span className="text-green-500/80">+ const [isHovered, setIsHovered] = useState(false);</span>
                  <br />
                  <span className="text-red-500/80">- const isActive = true;</span>
                </div>
              </div>

              <div className="glass p-3 rounded-lg border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-blue-400">src/App.tsx</span>
                  <span className="text-[10px] text-green-500">+2 -0</span>
                </div>
                <div className="text-[10px] font-mono text-white/20 whitespace-pre overflow-hidden bg-black/40 p-2 rounded">
                  <span className="text-green-500/80">+ console.log("Init Worktree");</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">Commit Message</label>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Describe your changes..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white placeholder:text-white/20 outline-none focus:ring-1 ring-blue-500/50 transition-all min-h-[80px] resize-none"
                />
              </div>
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || isCommitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/20 text-white rounded-lg transition-all text-xs font-semibold shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                {isCommitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <GitCommit size={14} />
                    Commit to Branch
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="h-full bg-[#050505] p-4 font-mono text-[12px] text-green-400/90 leading-relaxed overflow-y-auto">
            <div className="space-y-1">
              <p className="text-white/40"># Initializing Git Worktree...</p>
              <p className="text-blue-400">$ git worktree add ../worktrees/ai-refactor-auth ai/refactor-auth</p>
              <p className="text-white/80">Preparing worktree (checking out 'ai/refactor-auth')</p>
              <p className="text-white/40 mt-4"># Running .conductor.json setup...</p>
              <p className="text-blue-400">$ npm install</p>
              <p className="text-white/60">added 842 packages in 4s</p>
              <p className="text-white/40 mt-4"># Starting Claude Code Agent Session...</p>
              <p className="text-green-400">$ claude --context "isolated"</p>
              {isCommitting && (
                <div className="mt-4">
                  <p className="text-white/40"># Executing Git Commit...</p>
                  <p className="text-blue-400">$ git add . && git commit -m "{commitMessage}"</p>
                  <p className="text-white/80">[ai/refactor-auth {Math.random().toString(16).substring(2, 8)}] {commitMessage}</p>
                </div>
              )}
              <p className="text-white animate-pulse">_</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-blue-500" />
          <span className="text-[10px] font-mono text-white/50">ai/refactor-auth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
          <span className="text-[10px] text-white/40 font-medium">Synced</span>
        </div>
      </div>
    </div>
  );
};

export default ContextExplorer;
