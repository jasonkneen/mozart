import React from 'react';

export interface EmptyRunStateProps {
  onAddScript: () => void;
  isDarkMode: boolean;
}

export const EmptyRunState: React.FC<EmptyRunStateProps> = ({ 
  onAddScript, 
  isDarkMode 
}) => {
  return (
    <div 
      className={`
        flex flex-col items-center justify-center 
        border border-dashed rounded-xl p-8
        ${isDarkMode ? 'border-neutral-700' : 'border-neutral-300'}
      `}
    >
      <button
        onClick={onAddScript}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm transition-colors mb-4
          ${isDarkMode 
            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' 
            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}
        `}
      >
        Add run script
      </button>
      
      <p 
        className={`
          text-sm text-center max-w-[200px]
          ${isDarkMode ? 'text-neutral-500' : 'text-neutral-500'}
        `}
      >
        Run tests or a development server to test changes in this workspace
      </p>
    </div>
  );
};
