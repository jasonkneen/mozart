import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Sparkles, X, Plus, Pin, PinOff,
  Code, FileText, Bug, Lightbulb, Rocket, Zap, Heart,
  Star, Coffee, Music, Flame, Moon, Sun, Cloud, Leaf
} from 'lucide-react';

// Available accent colors
const ACCENT_COLORS = [
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'green', color: '#22c55e', label: 'Green' },
  { id: 'purple', color: '#a855f7', label: 'Purple' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
  { id: 'red', color: '#ef4444', label: 'Red' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
];

// Available icons
const TAB_ICONS = [
  { id: 'sparkles', Icon: Sparkles, label: 'Sparkles' },
  { id: 'code', Icon: Code, label: 'Code' },
  { id: 'file', Icon: FileText, label: 'File' },
  { id: 'bug', Icon: Bug, label: 'Bug' },
  { id: 'lightbulb', Icon: Lightbulb, label: 'Idea' },
  { id: 'rocket', Icon: Rocket, label: 'Rocket' },
  { id: 'zap', Icon: Zap, label: 'Zap' },
  { id: 'heart', Icon: Heart, label: 'Heart' },
  { id: 'star', Icon: Star, label: 'Star' },
  { id: 'coffee', Icon: Coffee, label: 'Coffee' },
  { id: 'music', Icon: Music, label: 'Music' },
  { id: 'flame', Icon: Flame, label: 'Flame' },
  { id: 'moon', Icon: Moon, label: 'Moon' },
  { id: 'sun', Icon: Sun, label: 'Sun' },
  { id: 'cloud', Icon: Cloud, label: 'Cloud' },
  { id: 'leaf', Icon: Leaf, label: 'Leaf' },
];

export interface ChatTab {
  id: string;
  title: string;
  isActive?: boolean;
  isPinned?: boolean;
  accentColor?: string;
  iconId?: string;
}

export interface ChatTabBarProps {
  tabs: ChatTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onUpdateTab?: (id: string, updates: Partial<ChatTab>) => void;
  isDarkMode: boolean;
}

// Tab customization popup
function TabCustomizePopup({
  tab,
  onUpdate,
  onClose,
  isDarkMode,
  position,
}: {
  tab: ChatTab;
  onUpdate: (updates: Partial<ChatTab>) => void;
  onClose: () => void;
  isDarkMode: boolean;
  position: { x: number; y: number };
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const currentColor = tab.accentColor || '#f59e0b';
  const currentIconId = tab.iconId || 'sparkles';

  return (
    <div
      ref={popupRef}
      className={`
        fixed z-[100] p-3 rounded-xl shadow-2xl border animate-in fade-in zoom-in-95 duration-150
        ${isDarkMode ? 'bg-[#1f1f1f] border-white/10' : 'bg-white border-neutral-200'}
      `}
      style={{
        left: position.x,
        top: position.y,
        minWidth: 220,
      }}
    >
      {/* Pin Toggle */}
      <button
        onClick={() => onUpdate({ isPinned: !tab.isPinned })}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-2
          ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-neutral-100'}
        `}
      >
        {tab.isPinned ? (
          <PinOff size={16} className="text-amber-500" />
        ) : (
          <Pin size={16} className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'} />
        )}
        <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
          {tab.isPinned ? 'Unpin tab' : 'Pin tab'}
        </span>
        {tab.isPinned && (
          <span className="ml-auto text-xs text-amber-500 font-medium">Pinned</span>
        )}
      </button>

      {/* Color Selector */}
      <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-white/5' : 'border-neutral-100'}`}>
        <div className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-white/40' : 'text-neutral-500'}`}>
          Color
        </div>
        <div className="flex items-center gap-1.5">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => onUpdate({ accentColor: c.color })}
              className={`
                w-6 h-6 rounded-full transition-transform hover:scale-110
                ${currentColor === c.color ? 'ring-2 ring-offset-2 ring-offset-[#1f1f1f]' : ''}
              `}
              style={{ backgroundColor: c.color, ringColor: c.color }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Icon Selector */}
      <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-white/5' : 'border-neutral-100'}`}>
        <div className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-white/40' : 'text-neutral-500'}`}>
          Icon
        </div>
        <div className="grid grid-cols-8 gap-1">
          {TAB_ICONS.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => onUpdate({ iconId: id })}
              className={`
                w-6 h-6 rounded flex items-center justify-center transition-colors
                ${currentIconId === id
                  ? 'bg-white/10 text-white'
                  : isDarkMode ? 'text-neutral-500 hover:text-white hover:bg-white/5' : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'
                }
              `}
              title={label}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Get icon component by id
function getTabIcon(iconId: string | undefined) {
  const found = TAB_ICONS.find(i => i.id === iconId);
  return found?.Icon || Sparkles;
}

export const ChatTabBar: React.FC<ChatTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onUpdateTab,
  isDarkMode,
}) => {
  const [customizingTab, setCustomizingTab] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const handleDoubleClick = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupPosition({
      x: Math.min(rect.left, window.innerWidth - 240),
      y: rect.bottom + 8,
    });
    setCustomizingTab(tabId);
  };

  // Sort tabs: pinned first, then others
  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const customizingTabData = tabs.find(t => t.id === customizingTab);

  return (
    <div className={`
      flex items-center w-full border-b select-none
      ${isDarkMode ? 'border-neutral-800 bg-[#242424]' : 'border-neutral-200 bg-white'}
    `}>
      <div className={`
        flex items-center justify-center h-9 w-10 border-r flex-shrink-0
        ${isDarkMode ? 'border-neutral-800 text-neutral-500' : 'border-neutral-200 text-neutral-400'}
      `}>
        <MessageSquare size={16} />
      </div>

      <div className="flex flex-1 items-center overflow-x-auto scrollbar-hide">
        {sortedTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const accentColor = tab.accentColor || '#f59e0b';
          const TabIcon = getTabIcon(tab.iconId);

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={(e) => handleDoubleClick(e, tab.id)}
              className={`
                group relative flex items-center h-9 px-3 cursor-pointer border-r transition-colors
                ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}
                ${isActive
                  ? (isDarkMode ? 'bg-neutral-800/40 text-neutral-200' : 'bg-neutral-50 text-neutral-900')
                  : (isDarkMode ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50')}
              `}
            >
              {tab.isPinned && (
                <Pin size={10} className="absolute top-1 right-1 text-amber-500/60" />
              )}

              <TabIcon
                size={14}
                className="mr-2 flex-shrink-0"
                style={{ color: isActive ? accentColor : undefined }}
              />

              <span className="text-sm font-medium truncate max-w-[120px]">
                {tab.title}
              </span>

              {!tab.isPinned && (
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
              )}

              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full mx-2 mb-[1px]"
                  style={{ backgroundColor: accentColor }}
                />
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

      {/* Tab Customization Popup */}
      {customizingTab && customizingTabData && onUpdateTab && (
        <TabCustomizePopup
          tab={customizingTabData}
          onUpdate={(updates) => onUpdateTab(customizingTab, updates)}
          onClose={() => setCustomizingTab(null)}
          isDarkMode={isDarkMode}
          position={popupPosition}
        />
      )}
    </div>
  );
};

export default ChatTabBar;
