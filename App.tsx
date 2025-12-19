
import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatInterface from './components/ChatInterface';
import VersionControl from './components/VersionControl';
import SettingsModal from './components/SettingsModal';
import { Message, ThinkingLevel } from './types';
import { Cpu } from 'lucide-react';
import { useConductorStore } from './services/store';
import { agentService } from './services/agentService';
import { gitService } from './services/gitService';

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

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
  const activeMessages = activeWorkspaceId ? messages[activeWorkspaceId] || [] : [];
  const activeDiffs = activeWorkspaceId ? diffsByWorkspace[activeWorkspaceId] || [] : [];
  const activeFileTree = activeWorkspaceId ? fileTreeByWorkspace[activeWorkspaceId] || [] : [];
  const isDiffsLoading = activeWorkspaceId ? diffsLoadingByWorkspace[activeWorkspaceId] || false : false;

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
      } catch (error) {
        console.error(error);
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

  const handleSendMessage = async (content: string, level: ThinkingLevel) => {
    if (!activeWorkspaceId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      level
    };

    actions.addMessage(activeWorkspaceId, userMessage);

    try {
      const history = (messages[activeWorkspaceId] || []).map(m => ({ 
        role: m.role, 
        content: m.content 
      }));

      const response = await agentService.generateResponse({
        prompt: content,
        level,
        history,
        provider: 'codex',
        model: 'gpt-5-codex'
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        level,
        traces: [
          { type: 'Thinking', content: 'Processing orchestration...' }
        ]
      };

      actions.addMessage(activeWorkspaceId, aiMessage);
    } catch (error) {
      console.error(error);
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
      } catch (error) {
        console.error(error);
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
      
      {activeWorkspaceId ? (
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
            <ChatInterface
              messages={activeMessages}
              onSendMessage={handleSendMessage}
            />
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
            onClick={handleAddWorkspace}
            className="px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/10 transition-all text-xs font-bold uppercase tracking-[0.1em] shadow-lg active:scale-95"
          >
            Spawn Agent
          </button>
        </div>
      )}

      {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

export default App;
