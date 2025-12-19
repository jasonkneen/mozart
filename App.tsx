
import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatInterface from './components/ChatInterface';
import VersionControl from './components/VersionControl';
import SettingsModal from './components/SettingsModal';
import { Cpu, AlertCircle, X, LogIn, LogOut, User } from 'lucide-react';
import { useConductorStore } from './services/store';
import { gitService } from './services/gitService';
import { oauthService } from './services/oauthService';

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
    diffsLoadingByWorkspace
  } = state;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ isLoggedIn: false, expiresIn: null });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
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
        const [diffs, fileTree] = await Promise.all([
          gitService.getWorkspaceDiffs(activeWorkspaceId),
          gitService.getWorkspaceFileTree(activeWorkspaceId)
        ]);
        if (cancelled) return;
        actions.setWorkspaceDiffs(activeWorkspaceId, diffs);
        actions.setWorkspaceFileTree(activeWorkspaceId, fileTree);
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
      await oauthService.openLoginWindow();
      // Poll for login completion
      const success = await oauthService.waitForLogin();
      if (success) {
        const status = await oauthService.getStatus();
        setAuthStatus({ isLoggedIn: status.isLoggedIn, expiresIn: status.expiresIn });
      } else {
        setError('Login timed out. Please try again.');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
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

  return (
    <div className="flex h-screen w-full bg-[#050505] overflow-hidden text-[#E5E5E5] font-sans selection:bg-blue-500/30">
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={actions.setActiveWorkspace}
        onAddWorkspace={handleAddWorkspace}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

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
                ? 'Complete authorization in the popup window...'
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
              location={activeWorkspace?.location || ''}
            />
            <ChatInterface />
          </div>
          <VersionControl
            diffs={activeDiffs}
            fileTree={activeFileTree}
            isLoading={isDiffsLoading}
          />
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-white/10 gap-6">
          <div className="w-24 h-24 border border-white/5 bg-white/[0.02] rounded-[2rem] flex items-center justify-center rotate-6 shadow-2xl backdrop-blur-3xl">
            <Cpu size={48} className="opacity-40" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white/40">Ready to Orchestrate</h3>
            <p className="text-sm max-w-xs mx-auto leading-relaxed">Select a workspace or spawn a new agent to begin development.</p>
          </div>
          <button
            onClick={() => handleAddWorkspace()}
            className="px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/10 transition-all text-xs font-bold uppercase tracking-[0.1em] shadow-lg active:scale-95"
          >
            Spawn Agent
          </button>
        </div>
      )}

      {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}

      {/* Auth Status Badge */}
      <div className="fixed top-4 right-4 z-50">
        {isAuthLoading ? (
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs text-white/40">
            Checking auth...
          </div>
        ) : authStatus.isLoggedIn ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-xl border border-green-500/30">
              <User size={14} className="text-green-400" />
              <span className="text-xs text-green-300 font-medium">Connected to Claude</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
              title="Logout"
            >
              <LogOut size={14} className="text-white/60" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl border border-blue-500/30 transition-colors"
          >
            <LogIn size={14} className="text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">Login to Claude</span>
          </button>
        )}
      </div>

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
