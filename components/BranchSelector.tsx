import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GitBranch, Search, Check, Plus, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface BranchSelectorProps {
  currentBranch: string;
  branches: string[];
  onSwitch: (branch: string) => void;
  onCreate: (branch: string) => void;
  isDarkMode?: boolean;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  currentBranch,
  branches,
  onSwitch,
  onCreate,
  isDarkMode = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter and group branches
  const { localBranches, remoteBranches } = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = branches.filter(b => b.toLowerCase().includes(query));
    
    const local: string[] = [];
    const remote: string[] = [];

    filtered.forEach(branch => {
      if (branch.startsWith('origin/')) {
        remote.push(branch);
      } else {
        local.push(branch);
      }
    });

    return { localBranches: local, remoteBranches: remote };
  }, [branches, searchQuery]);

  const handleCreate = () => {
    onCreate(searchQuery);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSwitch = (branch: string) => {
    onSwitch(branch);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Color styles based on mode
  const theme = isDarkMode ? {
    text: "text-neutral-300",
    textDim: "text-neutral-500",
    bg: "bg-neutral-900/50",
    bgHover: "hover:bg-neutral-800/50",
    border: "border-neutral-800",
    dropdownBg: "bg-neutral-900",
    inputBg: "bg-neutral-950",
    sectionText: "text-neutral-500",
    accentBg: "hover:bg-neutral-800",
    divider: "border-neutral-800"
  } : {
    text: "text-neutral-700",
    textDim: "text-neutral-400",
    bg: "bg-white/80",
    bgHover: "hover:bg-neutral-100",
    border: "border-neutral-200",
    dropdownBg: "bg-white",
    inputBg: "bg-neutral-50",
    sectionText: "text-neutral-500",
    accentBg: "hover:bg-neutral-100",
    divider: "border-neutral-100"
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200 group border border-transparent",
          isOpen ? theme.bgHover : "hover:bg-transparent",
          isOpen && `border-opacity-100 ${theme.border}`
        )}
      >
        <GitBranch 
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isDarkMode 
              ? "text-neutral-500 group-hover:text-neutral-400" 
              : "text-neutral-400 group-hover:text-neutral-600"
          )} 
        />
        <span 
          className={cn(
            "truncate text-sm font-medium max-w-[120px]",
            theme.text
          )}
          title={currentBranch}
        >
          {currentBranch}
        </span>
        <ChevronDown 
          className={cn(
            "h-3 w-3 opacity-50 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={cn(
            "absolute top-full left-0 mt-1 w-72 rounded-lg border shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100 z-50 overflow-hidden flex flex-col",
            theme.dropdownBg,
            theme.border,
            isDarkMode ? "shadow-black/50" : "shadow-neutral-200/50"
          )}
        >
          {/* Search Header */}
          <div className={cn("p-2 border-b", theme.divider)}>
            <div className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
              theme.inputBg
            )}>
              <Search className="h-4 w-4 opacity-50 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Select or create branch..."
                className={cn(
                  "flex-1 bg-transparent border-none outline-none placeholder:opacity-50 min-w-0",
                  theme.text
                )}
              />
            </div>
          </div>

          {/* Branch List */}
          <div className="flex-1 overflow-y-auto max-h-[300px] py-1 custom-scrollbar">
            {localBranches.length === 0 && remoteBranches.length === 0 && (
              <div className="px-4 py-8 text-center text-xs opacity-50">
                No branches found
              </div>
            )}

            {/* Local Branches */}
            {localBranches.length > 0 && (
              <div className="py-1">
                <div className={cn("px-3 py-1 text-[10px] uppercase tracking-wider font-semibold", theme.sectionText)}>
                  Local Branches
                </div>
                {localBranches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => handleSwitch(branch)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors text-left group",
                      theme.accentBg,
                      branch === currentBranch && (isDarkMode ? "bg-neutral-800/50" : "bg-neutral-50")
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GitBranch className={cn("h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity", 
                        branch === currentBranch && "opacity-100 text-blue-500"
                      )} />
                      <span className={cn("truncate", theme.text, branch === currentBranch && "font-medium")}>
                        {branch}
                      </span>
                    </div>
                    {branch === currentBranch && (
                      <Check className="h-4 w-4 text-blue-500 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Remote Branches */}
            {remoteBranches.length > 0 && (
              <div className="py-1">
                <div className={cn("px-3 py-1 text-[10px] uppercase tracking-wider font-semibold mt-2", theme.sectionText)}>
                  Remote Branches
                </div>
                {remoteBranches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => handleSwitch(branch)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left group",
                      theme.accentBg
                    )}
                  >
                     <div className="w-3.5" /> {/* Spacer for alignment */}
                    <span className={cn("truncate opacity-80", theme.text)}>
                      {branch}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className={cn("p-1 border-t", theme.divider)}>
            <button
              onClick={handleCreate}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                theme.accentBg,
                theme.text
              )}
            >
              <div className="flex items-center justify-center h-5 w-5 rounded bg-blue-500/10 text-blue-500 shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span className="truncate font-medium">
                {searchQuery ? `Create new branch "${searchQuery}"` : "Create new branch..."}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
