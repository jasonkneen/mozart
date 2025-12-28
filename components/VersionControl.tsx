
import React, { useState, useCallback } from 'react';
import { FileDiff, FileNode, DiffHunk } from '../types';
import {
  Folder, FileCode, GitBranch, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle2, Search, Filter, Plus, Play, ExternalLink,
  ArrowLeft, X
} from 'lucide-react';
import Terminal from './Terminal';
import DiffViewer from './DiffViewer';
import ReviewPanel from './ReviewPanel';
import { gitService } from '../services/gitService';
import { SkeletonList, SkeletonFileTree } from './ui/skeleton';

type TerminalTab = {
  id: string;
  name: string;
  workspacePath?: string;
};

interface FileItemProps {
  node: FileNode;
  depth: number;
  onOpenFile?: (path: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({ node, depth, onOpenFile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = node.type === 'directory';

  const handleClick = () => {
    if (isDir) {
      setIsOpen(!isOpen);
    } else if (onOpenFile) {
      onOpenFile(node.path);
    }
  };

  return (
    <div className="select-none">
      <div 
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 cursor-pointer rounded transition-colors group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
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
        <FileItem key={child.path} node={child} depth={depth + 1} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
};

interface PullRequestInfo {
  number: number;
  status: 'draft' | 'open' | 'ready' | 'merged' | 'closed';
  url?: string;
}

interface VersionControlProps {
  diffs: FileDiff[];
  fileTree: FileNode[];
  isLoading: boolean;
  workspacePath?: string;
  workspaceId?: string;
  pullRequest?: PullRequestInfo;
  width?: number;
  onResizeStart?: () => void;
  onOpenFile?: (path: string) => void;
  onOpenDiff?: (path: string) => void;
}

const VersionControl: React.FC<VersionControlProps> = ({ 
  diffs, 
  fileTree, 
  isLoading, 
  workspacePath, 
  workspaceId, 
  pullRequest,
  width = 400,
  onResizeStart,
  onOpenFile,
  onOpenDiff
}) => {
  const [activeTab, setActiveTab] = useState<'changes' | 'files' | 'review'>('changes');
  const [bottomTab, setBottomTab] = useState<'run' | 'terminals'>('terminals');
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null);
  const [diffHunks, setDiffHunks] = useState<DiffHunk[]>([]);

  // Multi-terminal state
  const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([
    { id: 'term-1', name: 'Terminal 1', workspacePath }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState('term-1');

  const addTerminal = useCallback(() => {
    const newId = `term-${Date.now()}`;
    const newTab: TerminalTab = {
      id: newId,
      name: `Terminal ${terminalTabs.length + 1}`,
      workspacePath
    };
    setTerminalTabs(prev => [...prev, newTab]);
    setActiveTerminalId(newId);
  }, [terminalTabs.length, workspacePath]);

  const closeTerminal = useCallback((id: string) => {
    if (terminalTabs.length <= 1) return; // Keep at least one terminal
    setTerminalTabs(prev => prev.filter(t => t.id !== id));
    if (activeTerminalId === id) {
      const remaining = terminalTabs.filter(t => t.id !== id);
      setActiveTerminalId(remaining[0]?.id || '');
    }
  }, [terminalTabs, activeTerminalId]);

  // Load diff hunks from the API
  const loadDiffHunks = async (diff: FileDiff) => {
    setSelectedDiff(diff);

    // If we already have hunks cached on the diff, use them
    if (diff.hunks && diff.hunks.length > 0) {
      setDiffHunks(diff.hunks);
      return;
    }

    // Otherwise fetch from API
    if (workspaceId) {
      try {
        const hunks = await gitService.getFileDiffHunks(workspaceId, diff.path);
        setDiffHunks(hunks);
      } catch (error) {
        console.error('Failed to load diff hunks:', error);
        setDiffHunks([]);
      }
    } else {
      setDiffHunks([]);
    }
  };

  return (
    <div
      className="h-full bg-surface border-l border-subtle flex flex-col shrink-0 relative"
      style={{ width }}
    >
      <div
        onMouseDown={onResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-50 -translate-x-0.5"
      />

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
        {/* PR Status Banner - only show when PR exists */}
        {pullRequest && (
          <div className={`flex items-center justify-between px-4 py-2 border-b ${
            pullRequest.status === 'ready' ? 'bg-green-900/10 border-green-500/20' :
            pullRequest.status === 'draft' ? 'bg-yellow-900/10 border-yellow-500/20' :
            'bg-blue-900/10 border-blue-500/20'
          }`}>
            <div className="flex items-center gap-2">
              <a 
                href={pullRequest.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded border flex items-center gap-1 hover:opacity-80 ${
                  pullRequest.status === 'ready' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
                  pullRequest.status === 'draft' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' :
                  'text-blue-500 bg-blue-500/10 border-blue-500/20'
                }`}
              >
                PR #{pullRequest.number} <ExternalLink size={10} />
              </a>
              <span className={`text-xs font-medium ${
                pullRequest.status === 'ready' ? 'text-green-400/90' :
                pullRequest.status === 'draft' ? 'text-yellow-400/90' :
                'text-blue-400/90'
              }`}>
                {pullRequest.status === 'ready' ? 'Ready to merge' :
                 pullRequest.status === 'draft' ? 'Draft' :
                 pullRequest.status === 'merged' ? 'Merged' :
                 pullRequest.status === 'closed' ? 'Closed' : 'Open'}
              </span>
            </div>
            {pullRequest.status === 'ready' && (
              <button className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase rounded shadow-lg transition-all active:scale-95">
                <CheckCircle2 size={12} />
                Merge
              </button>
            )}
          </div>
        )}

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
          {pullRequest && (
            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'review' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Review <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block ml-1 animate-pulse" />
            </button>
          )}
          <div className="ml-auto flex items-center">
            <button className="p-1.5 text-white/20 hover:text-white"><Search size={14} /></button>
            <button className="p-1.5 text-white/20 hover:text-white"><Filter size={14} /></button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-hide">
          {activeTab === 'changes' && (
            selectedDiff ? (
              <div className="h-full flex flex-col">
                <button
                  onClick={() => setSelectedDiff(null)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white transition-colors border-b border-white/5"
                >
                  <ArrowLeft size={14} />
                  Back to changes
                </button>
                <div className="flex-1 min-h-0">
                  <DiffViewer diff={selectedDiff} hunks={diffHunks} />
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {isLoading && (
                  <div className="px-3 py-4">
                    <SkeletonList count={4} itemClassName="px-2" />
                  </div>
                )}
                {!isLoading && diffs.length === 0 && (
                  <div className="px-3 py-6 text-xs text-muted">No changes detected.</div>
                )}
                {!isLoading && diffs.map((change) => (
                  <div
                    key={change.path}
                    onClick={() => onOpenDiff ? onOpenDiff(change.path) : loadDiffHunks(change)}
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-md cursor-pointer group"
                  >
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
            )
          )}
          {activeTab === 'files' && (
            <div className="space-y-0.5">
              {isLoading && (
                <div className="px-3 py-4">
                  <SkeletonFileTree count={8} depth={3} />
                </div>
              )}
              {!isLoading && fileTree.length === 0 && (
                <div className="px-3 py-6 text-xs text-muted">No files found.</div>
              )}
              {!isLoading && fileTree.map(node => (
                <FileItem key={node.path} node={node} depth={0} onOpenFile={onOpenFile} />
              ))}
            </div>
          )}
          {activeTab === 'review' && pullRequest && (
            <ReviewPanel
              diffs={diffs}
              workspaceId={workspaceId}
              prNumber={pullRequest.number}
              prTitle="Pull Request Review"
              onViewDiff={(diff) => {
                loadDiffHunks(diff);
                setActiveTab('changes');
              }}
            />
          )}
        </div>

        {/* Terminal/Run Drawer */}
        <div className={`${isTerminalExpanded ? 'h-[300px]' : 'h-10'} border-t border-subtle flex flex-col bg-base transition-all duration-200`}>
          <div className="h-10 px-2 flex items-center shrink-0">
            {/* Collapse/Expand chevron */}
            <button
              onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
              className="p-1.5 text-white/30 hover:text-white transition-colors"
              title={isTerminalExpanded ? 'Collapse' : 'Expand'}
            >
              {isTerminalExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {/* Run tab */}
            <button
              onClick={() => setBottomTab('run')}
              className={`text-xs h-full px-3 transition-all ${
                bottomTab === 'run' ? 'text-white border-b-2 border-white/80' : 'text-white/40 hover:text-white'
              }`}
            >
              Run
            </button>

            {/* Terminal tabs */}
            {terminalTabs.map((tab, index) => (
              <button
                key={tab.id}
                className={`relative text-xs h-full px-3 transition-all group flex items-center gap-1.5 ${
                  bottomTab === 'terminals' && activeTerminalId === tab.id 
                    ? 'text-white border-b-2 border-white/80' 
                    : 'text-white/40 hover:text-white'
                }`}
                onClick={() => {
                  setBottomTab('terminals')
                  setActiveTerminalId(tab.id)
                }}
              >
                <span>Terminal {index + 1}</span>
                {terminalTabs.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTerminal(tab.id);
                    }}
                    className="ml-0.5 p-0.5 rounded hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X size={10} />
                  </span>
                )}
              </button>
            ))}

            {/* Add terminal button */}
            <button
              onClick={addTerminal}
              className="h-full px-2 text-white/30 hover:text-white transition-colors"
              title="New terminal"
            >
              <Plus size={14} />
            </button>

            {/* Right side controls */}
            <div className="ml-auto flex items-center gap-2">
              {bottomTab === 'run' && (
                <button className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded text-[10px] font-bold text-white/60 hover:text-white border border-white/10 transition-all active:scale-95">
                  <Play size={10} fill="currentColor" /> Run <span className="opacity-40">⌘R</span>
                </button>
              )}
            </div>
          </div>
          {isTerminalExpanded && (
            <div className="flex-1 overflow-hidden">
              {bottomTab === 'terminals' ? (
                <Terminal 
                  key={activeTerminalId}
                  workspacePath={terminalTabs.find(t => t.id === activeTerminalId)?.workspacePath} 
                  className="h-full" 
                />
              ) : (
                <div className="h-full bg-black/40 p-4 font-mono text-[11px] leading-relaxed overflow-y-auto">
                  <div className="space-y-1 text-white/70">
                    <p className="text-white/30"># No run configuration</p>
                    <p className="text-white/30"># Add a run script to package.json or create a run config</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionControl;
