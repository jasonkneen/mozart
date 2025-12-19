import React from 'react';
import { GitBranch, Folder, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ChatPanelHeaderProps {
  gitBranch?: string; // "conductor/cambridge" or "main"
  projectName?: string; // "/cambridge", "/san-jose"
  projectPath?: string; // Full path for tooltip
  onOpenProject?: () => void;
  onProjectMenuOpen?: () => void;
  isDarkMode: boolean;
}

export const ChatPanelHeader: React.FC<ChatPanelHeaderProps> = ({
  gitBranch = "main",
  projectName,
  projectPath,
  onOpenProject,
  onProjectMenuOpen,
  isDarkMode
}) => {
  return (
    <div 
      className={cn(
        "flex h-10 w-full shrink-0 items-center justify-between border-b px-3 backdrop-blur-sm select-none",
        isDarkMode 
          ? "bg-neutral-900/50 border-neutral-800" 
          : "bg-white/80 border-neutral-200"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 mr-4">
        <GitBranch 
          className={cn(
            "h-4 w-4 shrink-0",
            isDarkMode ? "text-neutral-500" : "text-neutral-400"
          )} 
        />
        <span 
          className={cn(
            "truncate text-sm font-medium",
            isDarkMode ? "text-neutral-300" : "text-neutral-700"
          )}
          title={gitBranch}
        >
          {gitBranch}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {projectName && (
          <div 
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors cursor-help",
              isDarkMode 
                ? "bg-neutral-800 border-neutral-700/50 text-neutral-300 hover:bg-neutral-700/50" 
                : "bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-neutral-200/50"
            )}
            title={projectPath || projectName}
            onClick={onOpenProject}
            role="button"
          >
            <Folder className="h-3 w-3 opacity-70" />
            <span className="truncate max-w-[150px]">{projectName}</span>
          </div>
        )}

        <button
          onClick={onProjectMenuOpen}
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors",
            isDarkMode 
              ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800" 
              : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
          )}
        >
          <span>Open</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </div>
    </div>
  );
};
