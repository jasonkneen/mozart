import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '../lib/utils';

export interface SlashCommand {
  name: string;
  description: string;
  source?: string;
}

export interface SlashCommandMenuProps {
  commands: SlashCommand[];
  filter: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  commands,
  filter,
  selectedIndex,
  onSelect,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const filteredCommands = useMemo(() => {
    const lowerFilter = filter.toLowerCase();
    return commands.filter((cmd) => {
      return (
        cmd.name.toLowerCase().includes(lowerFilter) ||
        cmd.description.toLowerCase().includes(lowerFilter)
      );
    });
  }, [commands, filter]);

  useEffect(() => {
    const selectedRef = itemRefs.current[selectedIndex];
    if (selectedRef && menuRef.current) {
      const menu = menuRef.current;
      const itemTop = selectedRef.offsetTop;
      const itemBottom = itemTop + selectedRef.offsetHeight;
      const menuTop = menu.scrollTop;
      const menuBottom = menuTop + menu.offsetHeight;

      if (itemBottom > menuBottom) {
        menu.scrollTop = itemBottom - menu.offsetHeight;
      } else if (itemTop < menuTop) {
        menu.scrollTop = itemTop;
      }
    }
  }, [selectedIndex, filteredCommands]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, filteredCommands.length);
  }, [filteredCommands]);

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute bottom-full left-0 mb-2 w-[400px] max-w-[90vw] max-h-[300px] overflow-y-auto",
        "bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl z-50 flex flex-col p-1"
      )}
    >
      {filteredCommands.map((command, index) => {
        const isSelected = index === selectedIndex;
        
        return (
          <button
            key={`${command.name}-${index}`}
            ref={(el) => {
                itemRefs.current[index] = el;
                return;
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between group",
              isSelected ? "bg-neutral-800" : "hover:bg-neutral-800"
            )}
            onClick={() => onSelect(command)}
            type="button"
          >
            <div className="flex flex-col min-w-0 flex-1 mr-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-200">
                  <span className="text-neutral-500 mr-0.5">/</span>
                  {command.name}
                </span>
              </div>
              <span className="text-xs text-neutral-500 truncate mt-0.5">
                {command.description}
              </span>
            </div>
            
            {command.source && (
              <span className="text-[10px] text-neutral-600 font-medium whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity">
                ({command.source})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SlashCommandMenu;
