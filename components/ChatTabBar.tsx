import React from 'react';
import { MessageSquare, Sparkles, X, Plus } from 'lucide-react';

export interface ChatTab {
  id: string;
  title: string;
  isActive?: boolean;
}

export interface ChatTabBarProps {
  tabs: ChatTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  isDarkMode: boolean;
}

export const ChatTabBar: React.FC<ChatTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  isDarkMode,
}) => {
  return (
    <div className={`
      flex items-center w-full border-b select-none
      ${isDarkMode ? 'border-neutral-800 bg-[#1e1e1e]' : 'border-neutral-200 bg-white'}
    `}>
      <div className={`
        flex items-center justify-center h-9 w-10 border-r flex-shrink-0
        ${isDarkMode ? 'border-neutral-800 text-neutral-500' : 'border-neutral-200 text-neutral-400'}
      `}>
        <MessageSquare size={16} />
      </div>

      <div className="flex flex-1 items-center overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`
                group relative flex items-center h-9 px-3 cursor-pointer border-r transition-colors
                ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}
                ${isActive 
                  ? (isDarkMode ? 'bg-neutral-800/40 text-neutral-200' : 'bg-neutral-50 text-neutral-900') 
                  : (isDarkMode ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50')}
              `}
            >
              <Sparkles 
                size={14} 
                className={`
                  mr-2 flex-shrink-0
                  ${isActive ? 'text-amber-500' : (isDarkMode ? 'text-neutral-600 group-hover:text-neutral-500' : 'text-neutral-400 group-hover:text-neutral-500')}
                `} 
              />
              
              <span className="text-sm font-medium truncate max-w-[120px]">
                {tab.title}
              </span>

              <div
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`
                  ml-1.5 w-4 h-4 rounded-sm flex items-center justify-center transition-opacity
                  ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  ${isDarkMode 
                    ? 'hover:bg-neutral-700 text-neutral-500 hover:text-neutral-300' 
                    : 'hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600'}
                `}
              >
                <X size={12} />
              </div>

              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full mx-2 mb-[1px]" />
              )}
            </div>
          );
        })}

        <button
          onClick={onNewTab}
          className={`
            flex items-center justify-center h-9 w-9 flex-shrink-0 transition-colors
            ${isDarkMode 
              ? 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800' 
              : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'}
          `}
          title="New Chat"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatTabBar;
