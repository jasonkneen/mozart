
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatInterface from './components/ChatInterface';
import VersionControl from './components/VersionControl';
import SettingsModal from './components/SettingsModal';
import { Workspace, Message, ThinkingLevel, Tab } from './types';
import { gemini } from './services/geminiService';
import { Cpu } from 'lucide-react';

const App: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    {
      id: 'ws-5',
      name: 'Fix sidepanel issues',
      branch: 'fix-sidepanel-chat-issues',
      location: 'memphis',
      timeAgo: '3mo ago',
      status: 'idle',
      fleetType: 'Nanobrowser',
      repo: 'conductor',
      diffs: { added: 4, removed: 4 }
    },
    {
      id: 'ws-1',
      name: 'Floating Chat UI',
      branch: 'fix/floating-chat-ui-improvements',
      location: 'san-jose',
      timeAgo: 'Ready to merge',
      status: 'Ready to merge',
      fleetType: 'Nanobrowser',
      repo: 'conductor',
      diffs: { added: 312, removed: 332 },
      unread: true
    },
    {
      id: 'ws-2',
      name: 'Bilbao workspace',
      branch: 'jasonkneen/bilbao',
      location: 'bilbao',
      timeAgo: 'Initializing...',
      status: 'Initializing...',
      fleetType: 'Nanobrowser',
      repo: 'conductor',
      diffs: { added: 0, removed: 0 }
    },
    {
      id: 'ws-canvas-1',
      name: 'Bandung Component',
      branch: 'jasonkneen-bandung',
      location: 'bandung',
      timeAgo: '3mo ago',
      status: 'idle',
      fleetType: 'Canvas',
      repo: 'conductor',
      diffs: { added: 12, removed: 0 }
    }
  ]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>('ws-5');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 't1', title: 'Claude', type: 'chat', active: true },
  ]);
  const [activeTabId, setActiveTabId] = useState('t1');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [messages, setMessages] = useState<Record<string, Message[]>>({
    'ws-5': [
      {
        id: 'msg-1',
        role: 'assistant',
        content: "I've successfully fixed all the side panel issues mentioned. The changes ensure a cleaner user experience with no leftover messages and a properly sized input field that grows with content.",
        timestamp: Date.now() - 3600000,
        traces: [
          { type: 'Thinking', content: 'Inspecting side-panel package structure...' },
          { type: 'Lint', command: 'cd pages/side-panel && npx eslint src/SidePanel.tsx', status: 'completed' },
          { type: 'Edit', content: 'components/ChatInput.tsx', diff: { added: 12, removed: 4 }, status: 'completed' },
          { type: 'Thinking', content: 'Summary: Fixed auto-resize logic and input reset.' }
        ],
        plan: {
          title: "Fix side panel issues",
          description: "Cleaning up UI issues in the chat component",
          steps: [
            { label: "Branch renamed", details: "Changed from conductor/memphis to fix-sidepanel-chat-issues", completed: true },
            { label: "Fixed leftover chat messages", details: "Added state clearing logic when panel gains focus", completed: true },
            { label: "Chat responsiveness", details: "Optimized Planner agent's web_task handling", completed: true },
            { label: "Fixed input sizing", details: "Improved auto-resize with 200px max height", completed: true }
          ]
        }
      }
    ]
  });
  const [isLoading, setIsLoading] = useState(false);

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
  const activeMessages = activeWorkspaceId ? messages[activeWorkspaceId] || [] : [];

  const handleSendMessage = async (content: string, level: ThinkingLevel) => {
    if (!activeWorkspaceId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      level
    };

    setMessages(prev => ({
      ...prev,
      [activeWorkspaceId]: [...(prev[activeWorkspaceId] || []), userMessage]
    }));

    setIsLoading(true);
    
    try {
      const history = (messages[activeWorkspaceId] || []).map(m => ({ 
        role: m.role, 
        content: m.content 
      }));

      const response = await gemini.generateResponse(content, level, history);

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

      setMessages(prev => ({
        ...prev,
        [activeWorkspaceId]: [...(prev[activeWorkspaceId] || []), aiMessage]
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWorkspace = () => {
    const id = `ws-${Date.now()}`;
    const newWs: Workspace = {
      id,
      name: 'New Agent Task',
      branch: `ai/task-${Math.floor(Math.random() * 1000)}`,
      location: 'local-env',
      timeAgo: 'just now',
      status: 'idle',
      fleetType: 'Nanobrowser',
      repo: 'conductor',
      diffs: { added: 0, removed: 0 }
    };
    setWorkspaces(prev => [...prev, newWs]);
    setMessages(prev => ({ ...prev, [id]: [] }));
    setActiveWorkspaceId(id);
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] overflow-hidden text-[#E5E5E5] font-sans selection:bg-blue-500/30">
      <Sidebar 
        workspaces={workspaces} 
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={setActiveWorkspaceId}
        onAddWorkspace={handleAddWorkspace}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      
      {activeWorkspaceId ? (
        <main className="flex flex-1 min-w-0">
          <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 shadow-2xl z-10">
            <TopBar 
              branch={activeWorkspace?.branch || ''} 
              tabs={tabs} 
              activeTabId={activeTabId} 
              onTabSelect={setActiveTabId}
              location={activeWorkspace?.location || ''}
            />
            <ChatInterface 
              messages={activeMessages} 
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
          <VersionControl />
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
