import React, { useEffect, useRef } from 'react';
import { MessageSquare, Bot, File, Folder } from 'lucide-react';

export type MentionType = 'notes' | 'agent' | 'file' | 'folder';

export interface MentionItem {
  id: string;
  name: string;
  type: MentionType;
  description?: string;
}

export interface AtMentionMenuProps {
  items: MentionItem[];
  filter: string;
  selectedIndex: number;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export const AtMentionMenu: React.FC<AtMentionMenuProps> = ({
  items,
  filter,
  selectedIndex,
  onSelect,
  onClose,
  isDarkMode,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(filter.toLowerCase())
  );

  const groupedItems = [...filteredItems].sort((a, b) => {
    const order = { notes: 0, agent: 1, file: 2, folder: 2 };
    const typeOrder = order[a.type] - order[b.type];
    if (typeOrder !== 0) return typeOrder;
    return a.name.localeCompare(b.name);
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (groupedItems.length === 0) return null;

  const getIcon = (type: MentionType) => {
    switch (type) {
      case 'notes':
        return <MessageSquare className="w-4 h-4 text-neutral-500" />;
      case 'agent':
        return <Bot className="w-4 h-4 text-neutral-500" />;
      case 'file':
        return <File className="w-4 h-4 text-neutral-500" />;
      case 'folder':
        return <Folder className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getTypeLabel = (type: MentionType) => {
    switch (type) {
      case 'notes':
        return 'Note';
      case 'agent':
        return 'Agent';
      case 'file':
        return 'File';
      case 'folder':
        return 'Folder';
    }
  };

  return (
    <div
      ref={menuRef}
      className={`absolute z-50 w-80 max-h-80 overflow-y-auto rounded-lg shadow-xl border ${
        isDarkMode
          ? 'bg-neutral-900 border-neutral-800'
          : 'bg-white border-neutral-200'
      }`}
    >
      {groupedItems.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <div
            key={item.id}
            ref={isSelected ? selectedRef : null}
            onClick={() => onSelect(item)}
            className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm ${
              isSelected
                ? isDarkMode
                  ? 'bg-neutral-800'
                  : 'bg-neutral-100'
                : ''
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {getIcon(item.type)}
              <div className="flex flex-col overflow-hidden">
                <span
                  className={`truncate font-medium ${
                    isDarkMode ? 'text-neutral-200' : 'text-neutral-900'
                  }`}
                >
                  {item.name}
                </span>
                {item.description && (
                  <span className="text-xs text-neutral-500 truncate">
                    {item.description}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
              {getTypeLabel(item.type)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
