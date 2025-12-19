import React from 'react';
import { ChevronDown, ChevronUp, Plus, X, Play } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TerminalTab {
  id: string;
  label: string;
  type: 'run' | 'terminal';
}

export interface RunTerminalPanelProps {
  tabs: TerminalTab[];
  activeTabId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTerminal: () => void;
  isDarkMode: boolean;
  children?: React.ReactNode;
}

export const RunTerminalPanel: React.FC<RunTerminalPanelProps> = ({
  tabs,
  activeTabId,
  isCollapsed,
  onToggleCollapse,
  onSelectTab,
  onCloseTab,
  onNewTerminal,
  isDarkMode,
  children,
}) => {
  const panelClasses = cn(
    "flex flex-col w-full border-t transition-all duration-200 ease-in-out font-sans",
    isDarkMode ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-white border-gray-200 text-gray-600"
  );

  const headerClasses = cn(
    "flex h-9 items-center px-1 select-none",
    isDarkMode ? "bg-neutral-900" : "bg-gray-50"
  );

  const tabClasses = (isActive: boolean) => cn(
    "group relative flex items-center h-full px-4 text-xs font-medium cursor-pointer transition-colors duration-150 min-w-[80px] justify-center",
    isActive 
      ? (isDarkMode ? "text-neutral-200 bg-neutral-800/50" : "text-gray-900 bg-white")
      : "hover:bg-neutral-800/30 hover:text-neutral-300"
  );

  return (
    <div className={panelClasses} style={{ height: isCollapsed ? 'auto' : '100%' }}>
      <div className={headerClasses}>
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex h-full w-8 items-center justify-center transition-colors hover:text-amber-500",
            isCollapsed && "text-neutral-500"
          )}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        <div className="flex flex-1 items-center h-full overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={tabClasses(isActive)}
                role="tab"
                aria-selected={isActive}
              >
                {tab.type === 'run' && (
                  <Play className={cn("mr-1.5 h-3 w-3", isActive ? "text-green-500" : "text-neutral-500")} />
                )}
                
                <span className="truncate max-w-[120px]">{tab.label}</span>

                {tab.type === 'terminal' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className={cn(
                      "ml-2 rounded-sm p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                      isDarkMode ? "hover:bg-neutral-700 hover:text-white" : "hover:bg-gray-200"
                    )}
                    title="Close Terminal"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center pl-2 border-l border-neutral-800/50 ml-1">
          <button
            onClick={onNewTerminal}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-sm transition-colors mx-1",
              isDarkMode 
                ? "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200" 
                : "text-gray-500 hover:bg-gray-200"
            )}
            title="New Terminal"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className={cn(
          "flex-1 overflow-hidden relative",
          isDarkMode ? "bg-neutral-950" : "bg-white"
        )}>
          {children}
        </div>
      )}
    </div>
  );
};

export default RunTerminalPanel;
