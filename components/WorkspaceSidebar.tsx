import { useState } from 'react';
import { 
  GitBranch, Plus, MoreHorizontal, Pin, Trash2, Check, X, Loader2, 
  Search, GitPullRequest, ExternalLink 
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface Workspace {
  id: string;
  name: string;
  projectFolder: string;
  isPinned?: boolean;
  lastAccessed?: Date;
  diffStats?: { additions: number; deletions: number };
  agentLocation?: string;
  pullRequest?: { 
    number: number; 
    url: string; 
    title?: string;
    author?: string;
    checksStatus?: 'pending' | 'success' | 'failure'; 
  };
}

export interface ProjectSection {
  name: string;
  workspaces: Workspace[];
}

export interface WorkspaceSidebarProps {
  sections: ProjectSection[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onNewWorkspace: (sectionName: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onPinWorkspace: (id: string) => void;
  isDarkMode: boolean;
  cmdKeyHeld?: boolean;
}

type ModalTab = 'prs' | 'branches' | 'linear';

interface WorkspaceModalProps {
  workspace: Workspace;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

function WorkspaceModal({ workspace, isOpen, onClose, isDarkMode }: WorkspaceModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('prs');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const tabs: { id: ModalTab; label: string }[] = [
    { id: 'prs', label: 'Pull requests' },
    { id: 'branches', label: 'Branches' },
    { id: 'linear', label: 'Linear issues' },
  ];

  // Mock data for display
  const mockPRs = workspace.pullRequest ? [{
    number: workspace.pullRequest.number,
    title: workspace.pullRequest.title || `PR #${workspace.pullRequest.number}`,
    author: workspace.pullRequest.author || 'unknown',
    status: workspace.pullRequest.checksStatus || 'pending',
    url: workspace.pullRequest.url,
  }] : [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[480px] max-h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-xl border shadow-2xl overflow-hidden',
        isDarkMode 
          ? 'bg-[#1A1A1A] border-white/10' 
          : 'bg-white border-neutral-200'
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDarkMode ? 'border-white/10' : 'border-neutral-200'
        )}>
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-blue-500" />
            <span className={cn(
              'font-medium',
              isDarkMode ? 'text-white' : 'text-neutral-900'
            )}>
              {workspace.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isDarkMode 
                ? 'hover:bg-white/10 text-white/60 hover:text-white' 
                : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
            )}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className={cn(
          'flex border-b',
          isDarkMode ? 'border-white/10' : 'border-neutral-200'
        )}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.id
                  ? isDarkMode 
                    ? 'text-white border-blue-500' 
                    : 'text-neutral-900 border-blue-500'
                  : isDarkMode
                    ? 'text-white/50 border-transparent hover:text-white/70'
                    : 'text-neutral-500 border-transparent hover:text-neutral-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-3">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border',
            isDarkMode 
              ? 'bg-neutral-900 border-white/10' 
              : 'bg-neutral-50 border-neutral-200'
          )}>
            <Search size={14} className={isDarkMode ? 'text-white/40' : 'text-neutral-400'} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`}
              className={cn(
                'flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500',
                isDarkMode ? 'text-white' : 'text-neutral-900'
              )}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-3 pb-3 max-h-[400px] overflow-y-auto">
          {activeTab === 'prs' && (
            <div className="flex flex-col gap-1">
              {mockPRs.length === 0 ? (
                <div className={cn(
                  'py-8 text-center text-sm',
                  isDarkMode ? 'text-white/40' : 'text-neutral-400'
                )}>
                  No pull requests found
                </div>
              ) : (
                mockPRs.map((pr) => (
                  <a
                    key={pr.number}
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg transition-colors',
                      isDarkMode 
                        ? 'hover:bg-white/5' 
                        : 'hover:bg-neutral-50'
                    )}
                  >
                    <GitPullRequest size={16} className="text-green-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-medium truncate',
                          isDarkMode ? 'text-white' : 'text-neutral-900'
                        )}>
                          {pr.title}
                        </span>
                        <ExternalLink size={12} className={isDarkMode ? 'text-white/30' : 'text-neutral-400'} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'text-xs',
                          isDarkMode ? 'text-white/50' : 'text-neutral-500'
                        )}>
                          #{pr.number} by {pr.author}
                        </span>
                        {pr.status === 'pending' && (
                          <span className="flex items-center gap-1 text-[10px] text-yellow-500">
                            <Loader2 size={10} className="animate-spin" />
                            Pending
                          </span>
                        )}
                        {pr.status === 'success' && (
                          <span className="flex items-center gap-1 text-[10px] text-green-500">
                            <Check size={10} />
                            Passed
                          </span>
                        )}
                        {pr.status === 'failure' && (
                          <span className="flex items-center gap-1 text-[10px] text-red-500">
                            <X size={10} />
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}

          {activeTab === 'branches' && (
            <div className={cn(
              'py-8 text-center text-sm',
              isDarkMode ? 'text-white/40' : 'text-neutral-400'
            )}>
              No branches to display
            </div>
          )}

          {activeTab === 'linear' && (
            <div className={cn(
              'py-8 text-center text-sm',
              isDarkMode ? 'text-white/40' : 'text-neutral-400'
            )}>
              No Linear issues linked
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function WorkspaceSidebar({
  sections,
  activeWorkspaceId,
  onSelectWorkspace,
  onNewWorkspace,
  onDeleteWorkspace,
  onPinWorkspace,
  isDarkMode,
  cmdKeyHeld = false,
}: WorkspaceSidebarProps) {
  const [modalWorkspace, setModalWorkspace] = useState<Workspace | null>(null);
  const allWorkspaces = sections.flatMap((section) => section.workspaces);

  const getWorkspaceIndex = (id: string) => {
    return allWorkspaces.findIndex((w) => w.id === id);
  };

  return (
    <>
      <div
        className={cn(
          'flex h-full w-64 flex-col overflow-y-auto border-r py-4 transition-colors',
          isDarkMode
            ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
            : 'bg-white border-neutral-200 text-neutral-700'
        )}
      >
        <div className="flex flex-col gap-6 px-3">
          {sections.map((section) => (
            <div key={section.name} className="flex flex-col gap-2">
              <div className="group flex items-center justify-between px-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {section.name}
                </h3>
              </div>

              <button
                onClick={() => onNewWorkspace(section.name)}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  isDarkMode
                    ? 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                )}
              >
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border transition-colors',
                    isDarkMode
                      ? 'border-neutral-700 bg-neutral-800 group-hover:border-neutral-600'
                      : 'border-neutral-300 bg-white group-hover:border-neutral-400'
                  )}
                >
                  <Plus size={12} />
                </div>
                <span>New workspace</span>
              </button>

              <div className="flex flex-col gap-0.5">
                {section.workspaces.map((workspace) => {
                  const isActive = workspace.id === activeWorkspaceId;
                  const globalIndex = getWorkspaceIndex(workspace.id);
                  const showShortcut = cmdKeyHeld && globalIndex < 9;

                  return (
                    <div
                      key={workspace.id}
                      className={cn(
                        'group relative flex cursor-pointer flex-col gap-1 rounded-md px-2 py-2 transition-all',
                        isActive
                          ? isDarkMode
                            ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                            : 'bg-neutral-100 text-neutral-900 shadow-sm'
                          : isDarkMode
                            ? 'hover:bg-neutral-800/50 hover:text-neutral-200'
                            : 'hover:bg-neutral-50 hover:text-neutral-900'
                      )}
                      onClick={() => onSelectWorkspace(workspace.id)}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-500" />
                      )}

                      {/* Row 1: Icon + Name + Diff stats + Actions */}
                      <div className="flex items-center gap-2">
                        <GitBranch
                          size={14}
                          className={cn(
                            'shrink-0',
                            isActive
                              ? 'text-blue-500'
                              : isDarkMode
                                ? 'text-neutral-500 group-hover:text-neutral-400'
                                : 'text-neutral-400 group-hover:text-neutral-500'
                          )}
                        />
                        <span className="truncate text-sm font-medium leading-none">
                          {workspace.name}
                        </span>

                        {/* Diff stats badge */}
                        {workspace.diffStats && (
                          <span className="flex items-center gap-0.5 text-[10px] font-mono">
                            <span className="text-green-500">+{workspace.diffStats.additions}</span>
                            <span className="text-red-500">-{workspace.diffStats.deletions}</span>
                          </span>
                        )}

                        {showShortcut && (
                          <span
                            className={cn(
                              'ml-auto text-[10px] font-medium opacity-100',
                              isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
                            )}
                          >
                            ⌘{globalIndex + 1}
                          </span>
                        )}

                        {!showShortcut && (
                          <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {workspace.isPinned && (
                              <Pin size={12} className="text-blue-500" fill="currentColor" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPinWorkspace(workspace.id);
                              }}
                              className={cn(
                                'rounded p-0.5 hover:bg-neutral-700/50',
                                workspace.isPinned && 'text-blue-500'
                              )}
                            >
                              {!workspace.isPinned && <Pin size={12} />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteWorkspace(workspace.id);
                              }}
                              className="rounded p-0.5 hover:bg-neutral-700/50 hover:text-red-400"
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalWorkspace(workspace);
                              }}
                              className="rounded p-0.5 hover:bg-neutral-700/50"
                            >
                              <MoreHorizontal size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Row 2: Agent location + PR + Check status */}
                      <div className="flex items-center gap-2 pl-5">
                        {workspace.agentLocation && (
                          <span
                            className={cn(
                              'text-xs',
                              isActive
                                ? isDarkMode
                                  ? 'text-neutral-400'
                                  : 'text-neutral-500'
                                : 'text-neutral-500 group-hover:text-neutral-400'
                            )}
                          >
                            in {workspace.agentLocation}
                          </span>
                        )}
                        
                        {!workspace.agentLocation && (
                          <span
                            className={cn(
                              'truncate text-xs',
                              isActive
                                ? isDarkMode
                                  ? 'text-neutral-400'
                                  : 'text-neutral-500'
                                : 'text-neutral-500 group-hover:text-neutral-400'
                            )}
                          >
                            {workspace.projectFolder}
                          </span>
                        )}

                        {workspace.pullRequest && (
                          <>
                            <span className={cn(
                              'text-xs',
                              isDarkMode ? 'text-white/30' : 'text-neutral-300'
                            )}>•</span>
                            <a
                              href={workspace.pullRequest.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"
                            >
                              PR #{workspace.pullRequest.number}
                            </a>
                            {workspace.pullRequest.checksStatus === 'pending' && (
                              <Loader2 size={10} className="text-yellow-500 animate-spin" />
                            )}
                            {workspace.pullRequest.checksStatus === 'success' && (
                              <Check size={10} className="text-green-500" />
                            )}
                            {workspace.pullRequest.checksStatus === 'failure' && (
                              <X size={10} className="text-red-500" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <WorkspaceModal
        workspace={modalWorkspace!}
        isOpen={modalWorkspace !== null}
        onClose={() => setModalWorkspace(null)}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
