import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { Message } from '../types';
import { ChatPanelHeader } from './ChatPanelHeader';
import { ChatTabBar, ChatTab } from './ChatTabBar';
import { EmptyChatState } from './EmptyChatState';
import { AgentStatusIndicator, AgentState } from './AgentStatusIndicator';
import { ChatInputArea, ChatInputAreaProps } from './ChatInputArea';
import { ChatMessage } from './ChatMessage';

export interface ChatPanelProps {
  tabs: ChatTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;

  messages: Message[];
  onSend: (content: string) => void;
  isSending?: boolean;

  model: string;
  onModelChange: (modelId: string) => void;
  contexts: ChatInputAreaProps['contexts'];
  onRemoveContext: (path: string) => void;

  gitBranch?: string;
  projectName?: string;
  projectPath?: string;
  onOpenProject?: () => void;
  onProjectMenuOpen?: () => void;

  agentState: AgentState;
  agentToolName?: string;
  agentMessage?: string;

  isDarkMode: boolean;
  className?: string;

  onAddContext?: (type: 'claude' | 'file' | 'folder') => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  messages,
  onSend,
  isSending = false,
  model,
  onModelChange,
  contexts,
  onRemoveContext,
  gitBranch,
  projectName,
  projectPath,
  onOpenProject,
  onProjectMenuOpen,
  agentState,
  agentToolName,
  agentMessage,
  isDarkMode,
  className,
  onAddContext
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      
      if (isNearBottom || messages.length > 0) {
        const behavior = messages.length === 1 ? 'auto' : 'smooth';
        bottomRef.current?.scrollIntoView({ behavior });
      }
    }
  }, [messages.length, agentState]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSend(inputValue);
    setInputValue('');
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-full w-full relative overflow-hidden",
        isDarkMode ? "bg-[#1e1e1e]" : "bg-white",
        className
      )}
    >
      <ChatPanelHeader
        gitBranch={gitBranch}
        projectName={projectName}
        projectPath={projectPath}
        onOpenProject={onOpenProject}
        onProjectMenuOpen={onProjectMenuOpen}
        isDarkMode={isDarkMode}
      />

      <ChatTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
        isDarkMode={isDarkMode}
      />

      <div 
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto min-h-0 relative scroll-smooth",
          isDarkMode ? "scrollbar-dark" : "scrollbar-light"
        )}
      >
        {messages.length === 0 ? (
          <EmptyChatState
            projectName={projectName}
            onAddContext={onAddContext}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div className="flex flex-col w-full max-w-3xl mx-auto px-4 py-6 gap-6">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isStreaming={index === messages.length - 1 && agentState === 'streaming'}
              />
            ))}
            
            <div ref={bottomRef} className="h-px w-full" />
          </div>
        )}
      </div>

      <div 
        className={cn(
          "flex-shrink-0 p-4 border-t z-10",
          isDarkMode 
            ? "bg-[#1e1e1e] border-neutral-800" 
            : "bg-white border-neutral-200"
        )}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="min-h-[24px]">
            <AgentStatusIndicator
              status={agentState}
              toolName={agentToolName}
              message={agentMessage}
            />
          </div>

          <ChatInputArea
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            isLoading={(agentState !== 'idle' && agentState !== 'error') || isSending}
            contexts={contexts}
            onRemoveContext={onRemoveContext}
            model={model}
            onModelChange={onModelChange}
            placeholder="Ask anything or paste code..."
            className={isDarkMode ? "text-neutral-200" : "text-neutral-900"}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
