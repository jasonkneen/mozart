import React, { useState } from 'react';
import { 
  GitBranch, Edit3, Plus, ChevronDown, Check, Terminal, 
  Code, Sparkles, Clock, Folder, Copy, FileText, X, FileCode, GitCompare,
  ExternalLink, Loader2
} from 'lucide-react';
import { Tab } from '../types';

interface PullRequestInfo {
  number: number;
  url: string;
  checksStatus?: 'pending' | 'success' | 'failure';
  checksPending?: number;
}

interface TopBarProps {
  branch: string;
  baseBranch?: string;
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onAddTab?: (type?: 'chat' | 'notes' | 'terminal') => void;
  onCloseTab?: (id: string) => void;
  onOpenInEditor?: (editor: string) => void;
  onRunScript?: (type: 'setup' | 'run' | 'archive') => void;
  config?: any;
  location: string;
  repoName?: string;
  cost?: number;
  pullRequest?: PullRequestInfo;
}

const TopBar: React.FC<TopBarProps> = ({ 
  branch, 
  baseBranch: _baseBranch, 
  tabs, 
  activeTabId, 
  onTabSelect, 
  onAddTab,
  onCloseTab, 
  onOpenInEditor, 
  config: _config, 
  location,
  repoName,
  cost,
  pullRequest,
}) => {
  const [copied, setCopied] = useState(false);
  const [openInMenuOpen, setOpenInMenuOpen] = useState(false);

  // Extract repo name from location path
  const displayRepoName = repoName || location.split('/').pop() || 'workspace';
  const displayPath = `/${displayRepoName}`;

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(location);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenIn = async (editor: string) => {
    if (onOpenInEditor) {
      onOpenInEditor(editor);
    } else {
      if (window.electronAPI?.isElectron) {
        try {
          const result = await window.electronAPI.openInEditor(editor, location);
          if (!result.success) {
            console.error('Failed to open in editor:', result.error);
          }
        } catch (err) {
          console.error('Failed to open in editor:', err);
        }
      } else {
        const commands: Record<string, string> = {
          'vscode': `code "${location}"`,
          'cursor': `cursor "${location}"`,
          'ghostty': `open -a Ghostty "${location}"`,
          'terminal': `open -a Terminal "${location}"`,
          'finder': `open "${location}"`,
        };
        console.log(`Would run: ${commands[editor]}`);
      }
    }
    setOpenInMenuOpen(false);
  };

  const editors = [
    { id: 'finder', name: 'Finder', icon: Folder },
    { id: 'cursor', name: 'Cursor', icon: Code },
    { id: 'vscode', name: 'VS Code', icon: Code },
    { id: 'zed', name: 'Zed', icon: Code },
    { id: 'xcode', name: 'Xcode', icon: Code },
    { id: 'ghostty', name: 'Ghostty', icon: Terminal, shortcut: '⌘O' },
    { id: 'warp', name: 'Warp', icon: Terminal },
    { id: 'terminal', name: 'Terminal', icon: Terminal },
    { id: 'github-desktop', name: 'GitHub Desktop', icon: GitBranch },
    { id: 'fork', name: 'Fork', icon: GitBranch },
  ];

  return (
    <div className="flex flex-col border-b border-white/5 bg-[#0A0A0A]">
      {/* Header row */}
      <div className="h-9 flex items-center px-3 border-b border-white/5">
        {/* Left: Repo/Branch */}
        <div className="flex items-center gap-1.5 text-white/60">
          <GitBranch size={12} className="text-white/40" />
          <span className="text-xs font-medium">{displayRepoName}/{branch}</span>
        </div>

        <div className="flex-1" />

        {/* Right: Path pill + Open dropdown + Cost + PR */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="flex items-center gap-1.5 px-2.5 py-1">
              <div className="w-3.5 h-3.5 bg-blue-500 rounded flex items-center justify-center">
                <FileText size={9} className="text-white" />
              </div>
              <span className="text-[10px] font-mono text-white/70">{displayPath}</span>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setOpenInMenuOpen(!openInMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-white/60 hover:text-white hover:bg-white/5 border-l border-white/10 transition-colors"
              >
                Open
                <ChevronDown size={10} />
              </button>
              
              {openInMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setOpenInMenuOpen(false)} 
                  />
                  <div className="absolute top-full right-0 mt-1 w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 max-h-[400px] overflow-y-auto">
                    {editors.map((editor) => (
                      <button
                        key={editor.id}
                        onClick={() => handleOpenIn(editor.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <editor.icon size={16} className="text-white/40" />
                        <span className="flex-1 text-left">{editor.name}</span>
                        {editor.shortcut && (
                          <span className="text-[10px] text-white/30">{editor.shortcut}</span>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-white/5 my-1" />
                    <button
                      onClick={handleCopyPath}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      {copied ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} className="text-white/40" />
                      )}
                      <span className="flex-1 text-left">Copy path</span>
                      <span className="text-[10px] text-white/30">⌘⇧C</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {cost !== undefined && (
            <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
              <span className="text-[10px] font-mono text-white/50">${cost.toFixed(4)}</span>
            </div>
          )}

          {pullRequest && (
            <a
              href={pullRequest.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors group"
            >
              <span className="text-[10px] font-medium text-white/70 group-hover:text-white">
                PR #{pullRequest.number}
              </span>
              <ExternalLink size={10} className="text-white/40" />
              {pullRequest.checksStatus === 'pending' && (
                <span className="flex items-center gap-1 text-[10px] text-yellow-400/80">
                  <Loader2 size={10} className="animate-spin" />
                  {pullRequest.checksPending} check{pullRequest.checksPending !== 1 ? 's' : ''} pending
                </span>
              )}
              {pullRequest.checksStatus === 'success' && (
                <span className="flex items-center gap-1 text-[10px] text-green-400/80">
                  <Check size={10} />
                  Checks passed
                </span>
              )}
              {pullRequest.checksStatus === 'failure' && (
                <span className="flex items-center gap-1 text-[10px] text-red-400/80">
                  <X size={10} />
                  Checks failed
                </span>
              )}
            </a>
          )}
        </div>
      </div>

      {/* Tab bar - single line with flexible tab widths */}
      <div className="h-9 flex items-center">
        {/* Notes tab (fixed width) */}
        <button
          onClick={() => {
            const notesTab = tabs.find(t => t.type === 'notes');
            if (notesTab) {
              onTabSelect(notesTab.id);
            } else {
              onAddTab?.('notes');
            }
          }}
          className={`h-full flex items-center justify-center px-3 border-b-2 flex-shrink-0 transition-all ${
            tabs.find(t => t.type === 'notes' && t.id === activeTabId)
              ? 'border-amber-500 text-white'
              : 'border-transparent text-white/30 hover:text-white/50'
          }`}
          title="Notes"
        >
          <Edit3 size={14} />
        </button>

        {/* Tabs container - grows to fill, tabs share space equally */}
        <div className="flex-1 h-full flex items-center min-w-0 overflow-x-auto scrollbar-hide">
          {/* Chat tabs */}
          {tabs.filter(t => t.type === 'chat').map((tab) => (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`group h-full flex items-center justify-center gap-2 px-3 text-xs font-medium transition-all border-b-2 cursor-pointer flex-1 min-w-[80px] max-w-[200px] ${
                activeTabId === tab.id
                  ? 'text-white border-amber-500'
                  : 'text-white/40 border-transparent hover:text-white/60'
              }`}
            >
              <Sparkles size={12} className="text-white/50 flex-shrink-0" />
              <span className="truncate">{tab.title}</span>
              {tabs.filter(t => t.type === 'chat').length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab?.(tab.id);
                  }}
                  className={`flex-shrink-0 p-0.5 rounded transition-opacity ${
                    activeTabId === tab.id ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                  }`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {/* File tabs */}
          {tabs.filter(t => t.type === 'file').map((tab) => (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`group h-full flex items-center justify-center gap-2 px-3 text-xs font-medium transition-all border-b-2 cursor-pointer flex-1 min-w-[80px] max-w-[200px] ${
                activeTabId === tab.id
                  ? 'text-white border-blue-500'
                  : 'text-white/40 border-transparent hover:text-white/60'
              }`}
            >
              <FileCode size={12} className="text-blue-400/70 flex-shrink-0" />
              <span className="flex items-center gap-1.5 min-w-0">
                {tab.isDirty && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                <span className="truncate">{tab.title}</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab?.(tab.id);
                }}
                className={`flex-shrink-0 p-0.5 rounded transition-opacity ${
                  activeTabId === tab.id ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                }`}
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Diff tabs */}
          {tabs.filter(t => t.type === 'diff').map((tab) => (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`group h-full flex items-center justify-center gap-2 px-3 text-xs font-medium transition-all border-b-2 cursor-pointer flex-1 min-w-[80px] max-w-[200px] ${
                activeTabId === tab.id
                  ? 'text-white border-green-500'
                  : 'text-white/40 border-transparent hover:text-white/60'
              }`}
            >
              <GitCompare size={12} className="text-green-400/70 flex-shrink-0" />
              <span className="truncate">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab?.(tab.id);
                }}
                className={`flex-shrink-0 p-0.5 rounded transition-opacity ${
                  activeTabId === tab.id ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                }`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add tab button (fixed) */}
        <button
          onClick={() => onAddTab?.('chat')}
          className="h-full flex items-center px-3 text-white/20 hover:text-white/40 transition-colors flex-shrink-0"
          title="New tab"
        >
          <Plus size={16} />
        </button>

        {/* History button (fixed) */}
        <button
          className="h-full flex items-center px-3 text-white/30 hover:text-white/50 transition-colors flex-shrink-0"
          title="History"
        >
          <Clock size={16} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
