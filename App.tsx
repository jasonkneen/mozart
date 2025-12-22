
import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatInterface from './components/ChatInterface';
import VersionControl from './components/VersionControl';
import SettingsModal from './components/SettingsModal';
import NotesEditor from './components/NotesEditor';
import Terminal from './components/Terminal';
import FileEditor from './components/FileEditor';
import DiffViewer from './components/DiffViewer';
import OAuthCodeModal from './components/OAuthCodeModal';
import { AlertCircle, X, LogIn, LogOut, User, FolderOpen, Globe, FileText, PanelLeft, PanelRight } from 'lucide-react';
import RepoModal, { RepoModalMode, RepoModalPayload } from './components/RepoModal';
import { useConductorStore } from './services/store';
import { gitService } from './services/gitService';
import { oauthService, openOAuthWindow } from './services/oauthService';
import { FileDiff, DiffHunk } from './types';

type AuthStatus = {
  isLoggedIn: boolean;
  expiresIn: number | null;
};

const App: React.FC = () => {
  const { state, actions } = useConductorStore();
  const {
    workspaces,
    activeWorkspaceId,
    tabs,
    activeTabId,
    messages,
    diffsByWorkspace,
    fileTreeByWorkspace,
    diffsLoadingByWorkspace,
    configsByWorkspace
  } = state;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ isLoggedIn: false, expiresIn: null });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [oauthAuthUrl, setOAuthAuthUrl] = useState<string | undefined>(undefined);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [repoModalMode, setRepoModalMode] = useState<RepoModalMode>('local');
  
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(400);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [diffHunksByTab, setDiffHunksByTab] = useState<Record<string, DiffHunk[]>>({});

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(400, e.clientX));
        setLeftSidebarWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(300, Math.min(600, window.innerWidth - e.clientX));
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizingLeft, isResizingRight]);

  const handleOpenRepoModal = (mode: RepoModalMode) => {
    setRepoModalMode(mode);
    setIsRepoModalOpen(true);
  };

  const handleCreateRepoWorkspace = (payload: RepoModalPayload) => {
    handleAddWorkspace({
      repoPath: payload.mode === 'local' ? payload.repoPath : undefined,
      repoUrl: payload.mode === 'url' ? payload.repoUrl : undefined,
      name: payload.workspaceName,
      branch: payload.branch,
      baseBranch: payload.baseBranch
    });
    setIsRepoModalOpen(false);
  };

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeConfig = activeWorkspaceId ? configsByWorkspace[activeWorkspaceId] : null;
  const activeMessages = activeWorkspaceId ? messages[activeWorkspaceId] || [] : [];
  const activeDiffs = activeWorkspaceId ? diffsByWorkspace[activeWorkspaceId] || [] : [];
  const activeFileTree = activeWorkspaceId ? fileTreeByWorkspace[activeWorkspaceId] || [] : [];
  const isDiffsLoading = activeWorkspaceId ? diffsLoadingByWorkspace[activeWorkspaceId] || false : false;

  // Check auth status on mount and periodically
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await oauthService.getStatus();
        setAuthStatus({ isLoggedIn: status.isLoggedIn, expiresIn: status.expiresIn });
      } catch (err) {
        console.error('Failed to check auth status:', err);
        setAuthStatus({ isLoggedIn: false, expiresIn: null });
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
    // Check every 30 seconds
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let cancelled = false;

    const loadWorkspaceData = async () => {
      actions.setWorkspaceDiffsLoading(activeWorkspaceId, true);
      try {
        const [diffs, fileTree, config] = await Promise.all([
          gitService.getWorkspaceDiffs(activeWorkspaceId),
          gitService.getWorkspaceFileTree(activeWorkspaceId),
          gitService.getWorkspaceConfig(activeWorkspaceId)
        ]);
        if (cancelled) return;
        actions.setWorkspaceDiffs(activeWorkspaceId, diffs);
        actions.setWorkspaceFileTree(activeWorkspaceId, fileTree);
        actions.setWorkspaceConfig(activeWorkspaceId, config);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load workspace data');
      } finally {
        if (!cancelled) {
          actions.setWorkspaceDiffsLoading(activeWorkspaceId, false);
        }
      }
    };

    loadWorkspaceData();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, actions]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      // Start login and get auth URL
      const { authUrl } = await oauthService.startLogin();
      setOAuthAuthUrl(authUrl);

      // Open auth page in new window using shared utility
      openOAuthWindow(authUrl);

      // Show modal for code entry
      setShowOAuthModal(true);
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoggingIn(false);
    }
  };

  const handleOAuthCodeSubmit = async (code: string) => {
    try {
      await oauthService.completeLogin(code);
      const status = await oauthService.getStatus();
      setAuthStatus({ isLoggedIn: status.isLoggedIn, expiresIn: status.expiresIn });
      setShowOAuthModal(false);
    } finally {
      setIsLoggingIn(false);
      setOAuthAuthUrl(undefined);
    }
  };

  const handleOAuthModalClose = () => {
    setShowOAuthModal(false);
    setIsLoggingIn(false);
    setOAuthAuthUrl(undefined);
    oauthService.clearPendingFlow();
  };

  const handleLogout = async () => {
    try {
      await oauthService.logout();
      setAuthStatus({ isLoggedIn: false, expiresIn: null });
    } catch (err) {
      console.error('Logout failed:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  const handleAddWorkspace = (options?: { repoPath?: string; repoUrl?: string; name?: string; branch?: string; baseBranch?: string }) => {
    const create = async () => {
      try {
        const newWorkspace = await gitService.createWorkspace({
          repoPath: options?.repoPath,
          repoUrl: options?.repoUrl,
          name: options?.name,
          branch: options?.branch,
          baseBranch: options?.baseBranch
        });
        actions.addWorkspace(newWorkspace);
        actions.setWorkspaceDiffsLoading(newWorkspace.id, true);
        const [diffs, fileTree] = await Promise.all([
          gitService.getWorkspaceDiffs(newWorkspace.id),
          gitService.getWorkspaceFileTree(newWorkspace.id)
        ]);
        actions.setWorkspaceDiffs(newWorkspace.id, diffs);
        actions.setWorkspaceFileTree(newWorkspace.id, fileTree);
        actions.setWorkspaceDiffsLoading(newWorkspace.id, false);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to create workspace. Make sure the backend is running (npm run dev:server).');
      }
    };
    create();
  };

  const handleAddTab = (type: 'chat' | 'notes' | 'terminal' = 'chat') => {
    const id = `t-${Date.now()}`;
    const titles = { chat: 'Claude', notes: 'Notes', terminal: 'Terminal' };
    const newTab = { id, title: titles[type], type, active: true };
    actions.setTabs([...tabs.map(t => ({ ...t, active: false })), newTab]);
    actions.setActiveTab(id);
  };

  const handleCloseTab = (tabId: string) => {
    const remaining = tabs.filter(t => t.id !== tabId);
    if (remaining.length === 0) return;
    actions.setTabs(remaining);
    if (activeTabId === tabId) {
      actions.setActiveTab(remaining[0].id);
    }
  };

  const handleOpenFile = (filePath: string) => {
    const existingTab = tabs.find(t => t.type === 'file' && t.filePath === filePath);
    if (existingTab) {
      actions.setActiveTab(existingTab.id);
      return;
    }

    const id = `file-${Date.now()}`;
    const fileName = filePath.split('/').pop() || filePath;
    const newTab = { 
      id, 
      title: fileName, 
      type: 'file' as const, 
      active: true,
      filePath 
    };
    actions.setTabs([...tabs.map(t => ({ ...t, active: false })), newTab]);
    actions.setActiveTab(id);
  };

  const refreshDiffs = async () => {
    if (!activeWorkspaceId) return;
    try {
      const diffs = await gitService.getWorkspaceDiffs(activeWorkspaceId);
      actions.setWorkspaceDiffs(activeWorkspaceId, diffs);
    } catch (err) {
      console.error('Failed to refresh diffs:', err);
    }
  };

  const handleOpenDiff = async (diffPath: string) => {
    const existingTab = tabs.find(t => t.type === 'diff' && t.diffPath === diffPath);
    if (existingTab) {
      actions.setActiveTab(existingTab.id);
      return;
    }

    const id = `diff-${Date.now()}`;
    const fileName = diffPath.split('/').pop() || diffPath;
    const newTab = { 
      id, 
      title: `Δ ${fileName}`, 
      type: 'diff' as const, 
      active: true,
      diffPath 
    };
    actions.setTabs([...tabs.map(t => ({ ...t, active: false })), newTab]);
    actions.setActiveTab(id);

    if (activeWorkspaceId) {
      try {
        const hunks = await gitService.getFileDiffHunks(activeWorkspaceId, diffPath);
        setDiffHunksByTab(prev => ({ ...prev, [id]: hunks }));
      } catch (err) {
        console.error('Failed to load diff hunks:', err);
      }
    }
  };

  const handleRunScript = async (type: 'setup' | 'run' | 'archive') => {
    if (!activeWorkspaceId) return;
    try {
      setError(null);
      const result = await gitService.runWorkspaceScript(activeWorkspaceId, type);
      if (result.success) {
        console.log(`Script ${type} finished:`, result.output);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to run script');
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] overflow-hidden text-[#E5E5E5] font-sans selection:bg-blue-500/30">
      {/* Sidebar toggle buttons - tracks left sidebar width */}
      <div
        className="fixed z-50 flex items-center gap-1 transition-[left] duration-150"
        style={{ left: showLeftSidebar ? leftSidebarWidth - 58 : 12, top: 11 }}
      >
        <button
          onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          className={`p-1.5 rounded transition-colors ${showLeftSidebar ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-white/30 hover:text-white/50'}`}
          title="Toggle left sidebar"
        >
          <PanelLeft size={16} />
        </button>
        <button
          onClick={() => setShowRightSidebar(!showRightSidebar)}
          className={`p-1.5 rounded transition-colors ${showRightSidebar ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-white/30 hover:text-white/50'}`}
          title="Toggle right sidebar"
        >
          <PanelRight size={16} />
        </button>
      </div>

      {showLeftSidebar && (
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={actions.setActiveWorkspace}
          onAddWorkspace={handleAddWorkspace}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onNotesClick={() => handleAddTab('notes')}
          width={leftSidebarWidth}
          onResizeStart={() => setIsResizingLeft(true)}
        />
      )}

      {/* Show login prompt if not authenticated */}
      {!isAuthLoading && !authStatus.isLoggedIn ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/10 gap-6">
          <div className="w-24 h-24 border border-blue-500/20 bg-blue-500/5 rounded-[2rem] flex items-center justify-center shadow-2xl backdrop-blur-3xl">
            <LogIn size={48} className="text-blue-400/60" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white/60">Connect to Claude</h3>
            <p className="text-sm max-w-xs mx-auto leading-relaxed text-white/40">
              {isLoggingIn
                ? 'Authorize in the popup, then paste the code in the modal...'
                : 'Login with your Anthropic account to start using Mozart AI Orchestrator.'}
            </p>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="px-8 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl border border-blue-500/30 transition-all text-sm font-bold shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                Waiting for authorization...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Login with Claude
              </>
            )}
          </button>
        </div>
      ) : activeWorkspaceId ? (
        <main className="flex flex-1 min-w-0">
          <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 shadow-2xl z-10">
            <TopBar
              branch={activeWorkspace?.branch || ''}
              baseBranch={activeWorkspace?.baseBranch}
              tabs={tabs}
              activeTabId={activeTabId}
              onTabSelect={actions.setActiveTab}
              onAddTab={handleAddTab}
              onCloseTab={handleCloseTab}
              onRunScript={handleRunScript}
              config={activeConfig}
              location={activeWorkspace?.location || ''}
            />

            {tabs.filter(t => t.type === 'chat').map(tab => (
              <div key={tab.id} className={tab.id === activeTabId ? 'contents' : 'hidden'}>
                <ChatInterface tabId={tab.id} />
              </div>
            ))}
            {activeTab?.type === 'notes' && activeWorkspace && (
              <NotesEditor
                notes={activeWorkspace.notes || ''}
                onChange={(notes) => actions.updateWorkspaceNotes(activeWorkspace.id, notes)}
              />
            )}
            {activeTab?.type === 'terminal' && (
              <Terminal workspacePath={activeWorkspace?.workspacePath || activeWorkspace?.repoPath} />
            )}
            {tabs.filter(t => t.type === 'file').map(tab => (
              <div key={tab.id} className={tab.id === activeTabId ? 'contents' : 'hidden'}>
                {tab.filePath && (
                  <FileEditor
                    filePath={tab.filePath}
                    workspacePath={activeWorkspace?.workspacePath || activeWorkspace?.repoPath}
                    language={tab.language}
                    onDirtyChange={(isDirty) => actions.setTabDirty(tab.id, isDirty)}
                    onSaveComplete={refreshDiffs}
                  />
                )}
              </div>
            ))}
            {tabs.filter(t => t.type === 'diff').map(tab => {
              const diff = activeDiffs.find(d => d.path === tab.diffPath);
              return (
                <div key={tab.id} className={tab.id === activeTabId ? 'contents' : 'hidden'}>
                  {diff && (
                    <DiffViewer
                      diff={diff}
                      hunks={diffHunksByTab[tab.id] || []}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {showRightSidebar && (
            <VersionControl
              diffs={activeDiffs}
              fileTree={activeFileTree}
              isLoading={isDiffsLoading}
              workspacePath={activeWorkspace?.workspacePath || activeWorkspace?.repoPath}
              workspaceId={activeWorkspaceId || undefined}
              width={rightSidebarWidth}
              onResizeStart={() => setIsResizingRight(true)}
              onOpenFile={handleOpenFile}
              onOpenDiff={handleOpenDiff}
            />
          )}
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[#E5E5E5] gap-12">
          <div className="font-mono text-[10px] sm:text-xs md:text-sm leading-[1.1] text-blue-500/80 whitespace-pre select-none opacity-80">
{`███    ███  ██████  ███████  █████  ██████  ████████
████  ████ ██    ██    ███  ██   ██ ██   ██    ██
██ ████ ██ ██    ██   ███   ███████ ██████     ██
██  ██  ██ ██    ██  ███    ██   ██ ██   ██    ██
██      ██  ██████  ███████ ██   ██ ██   ██    ██`}
          </div>

          <div className="grid grid-cols-3 gap-4 w-full max-w-2xl px-8">
            <button
              onClick={() => handleOpenRepoModal('local')}
              className="group flex flex-col items-start gap-3 p-6 bg-[#1A1A1A] hover:bg-[#222] border border-white/5 hover:border-white/10 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl text-left"
            >
              <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <FolderOpen size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/80 mb-1 group-hover:text-white">Open project</h3>
                <p className="text-xs text-white/40 leading-relaxed">Select a local repository to start orchestrating.</p>
              </div>
            </button>

            <button
              onClick={() => handleOpenRepoModal('url')}
              className="group flex flex-col items-start gap-3 p-6 bg-[#1A1A1A] hover:bg-[#222] border border-white/5 hover:border-white/10 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl text-left"
            >
              <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                <Globe size={24} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/80 mb-1 group-hover:text-white">Clone from URL</h3>
                <p className="text-xs text-white/40 leading-relaxed">Clone a repository from GitHub or other remote.</p>
              </div>
            </button>

            <button
              onClick={() => handleAddWorkspace()}
              className="group flex flex-col items-start gap-3 p-6 bg-[#1A1A1A] hover:bg-[#222] border border-white/5 hover:border-white/10 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl text-left"
            >
              <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                <FileText size={24} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/80 mb-1 group-hover:text-white">Quick start</h3>
                <p className="text-xs text-white/40 leading-relaxed">Spawn a new agent in a fresh workspace.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      <RepoModal
        isOpen={isRepoModalOpen}
        mode={repoModalMode}
        onClose={() => setIsRepoModalOpen(false)}
        onCreate={handleCreateRepoWorkspace}
      />

      <OAuthCodeModal
        isOpen={showOAuthModal}
        onClose={handleOAuthModalClose}
        onSubmit={handleOAuthCodeSubmit}
        authUrl={oauthAuthUrl}
      />

      {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}

      {error && (
        <div className="fixed bottom-6 right-6 max-w-md bg-red-500/10 border border-red-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-200 font-medium">Error</p>
              <p className="text-xs text-red-300/80 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={16} className="text-red-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
