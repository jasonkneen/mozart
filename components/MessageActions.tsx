import React from 'react';
import { GitFork } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { cn } from '../lib/utils';

export interface MessageActionsProps {
  timestamp: Date | number;
  onFork?: () => void;
  isDarkMode: boolean;
}

export function formatRelativeTime(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  timestamp,
  onFork,
  isDarkMode,
}) => {
  return (
    <div className="flex items-center gap-1.5 text-xs text-neutral-500 select-none">
      <span className="cursor-default">{formatRelativeTime(timestamp)}</span>
      
      {onFork && (
        <>
          <span>·</span>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onFork}
                  className={cn(
                    "p-0 bg-transparent border-none cursor-pointer transition-all duration-200 outline-none flex items-center justify-center",
                    "w-4 h-4 opacity-0 group-hover:opacity-100",
                    isDarkMode 
                      ? "hover:text-neutral-300" 
                      : "hover:text-neutral-700"
                  )}
                  type="button"
                  aria-label="Fork to new workspace"
                >
                  <GitFork className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className={cn(
                  "text-xs px-2 py-1", 
                  isDarkMode ? "bg-neutral-800 text-neutral-200 border-neutral-700" : "bg-white text-neutral-800"
                )}
              >
                Fork to new workspace
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  );
};

export default MessageActions;
