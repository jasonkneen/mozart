import React from 'react';
import { Sparkles } from 'lucide-react';

export interface EmptyChatStateProps {
  projectName?: string;
  tip?: string;
  onAddContext?: (type: 'claude' | 'file' | 'folder') => void;
  isDarkMode: boolean;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  projectName = '/project',
  tip = '⌘. to toggle zen mode',
  onAddContext,
  isDarkMode
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full select-none">
      <div className="flex flex-col items-center gap-1.5 mb-6">
        <div className={`text-base ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
          New chat in <span className={isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}>{projectName}</span>
        </div>

        <div className={`text-sm ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Tip: {tip}
        </div>
      </div>

      <button
        onClick={() => onAddContext?.('claude')}
        className={`
          flex items-center gap-2 h-8 px-3 rounded-lg text-sm border transition-all duration-200
          ${isDarkMode 
            ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600' 
            : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 bg-white'}
        `}
      >
        <Sparkles className="w-3.5 h-3.5 opacity-70" />
        <span>Add Claude context</span>
      </button>
    </div>
  );
};
