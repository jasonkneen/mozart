import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '../lib/utils';

import { AtMentionMenu, MentionItem } from './AtMentionMenu';
import SlashCommandMenu, { SlashCommand } from './SlashCommandMenu';
import { ContextBadges, ContextItem } from './ContextBadges';
import ModelSelector from './ModelSelector';
import { AgentStatusIndicator } from './AgentStatusIndicator';

export interface ChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  contexts: ContextItem[];
  onRemoveContext: (path: string) => void;
  model: string;
  onModelChange: (modelId: string) => void;
  
  mentionItems?: MentionItem[];
  slashCommands?: SlashCommand[];
  placeholder?: string;
  className?: string;
}

export function ChatInputArea({
  value,
  onChange,
  onSend,
  isLoading,
  contexts,
  onRemoveContext,
  model,
  onModelChange,
  mentionItems = [],
  slashCommands = [],
  placeholder = "Message...",
  className
}: ChatInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState<'mention' | 'command' | null>(null);
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 240);
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  const handleInputCheck = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
    const commandMatch = textBeforeCursor.match(/(?:^|\s)\/(\w*)$/);

    if (mentionMatch) {
      setMenuOpen('mention');
      setFilterText(mentionMatch[1]);
      updateMenuPosition(cursor);
    } else if (commandMatch) {
      setMenuOpen('command');
      setFilterText(commandMatch[1]);
      updateMenuPosition(cursor);
    } else {
      setMenuOpen(null);
      setFilterText('');
    }
  }, [value]);

  const updateMenuPosition = (cursorIndex: number) => {
    if (!textareaRef.current || !mirrorRef.current) return;

    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;

    const computed = window.getComputedStyle(textarea);
    mirror.style.width = computed.width;
    mirror.style.font = computed.font;
    mirror.style.padding = computed.padding;
    mirror.style.lineHeight = computed.lineHeight;

    const textBefore = value.slice(0, cursorIndex);
    mirror.textContent = textBefore;

    const span = document.createElement('span');
    span.textContent = '|';
    mirror.appendChild(span);

    const rect = span.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
    
    setMenuPosition({
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left
    });
  };

  useEffect(() => {
    handleInputCheck();
  }, [handleInputCheck]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText, menuOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (menuOpen) {
      const itemsLength = menuOpen === 'mention' 
        ? mentionItems.filter(i => i.name.toLowerCase().includes(filterText.toLowerCase())).length 
        : slashCommands.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()) || c.description.toLowerCase().includes(filterText.toLowerCase())).length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % itemsLength);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + itemsLength) % itemsLength);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        completeSelection();
      } else if (e.key === 'Escape') {
        setMenuOpen(null);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSend();
      }
    }
  };

  const completeSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (menuOpen === 'mention') {
      const filtered = mentionItems.filter(i => i.name.toLowerCase().includes(filterText.toLowerCase()));
      const item = filtered[selectedIndex];
      if (item) {
        insertText(`@${item.name} `);
      }
    } else if (menuOpen === 'command') {
      const filtered = slashCommands.filter(c => 
        c.name.toLowerCase().includes(filterText.toLowerCase()) || 
        c.description.toLowerCase().includes(filterText.toLowerCase())
      );
      const command = filtered[selectedIndex];
      if (command) {
        insertText(`/${command.name} `);
      }
    }
    setMenuOpen(null);
  };

  const insertText = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBefore = value.slice(0, cursor);
    const triggerChar = menuOpen === 'mention' ? '@' : '/';
    const lastTrigger = textBefore.lastIndexOf(triggerChar);
    
    if (lastTrigger !== -1) {
      const newValue = value.slice(0, lastTrigger) + textToInsert + value.slice(cursor);
      onChange(newValue);
      
      requestAnimationFrame(() => {
        const newCursor = lastTrigger + textToInsert.length;
        textarea.selectionStart = newCursor;
        textarea.selectionEnd = newCursor;
        textarea.focus();
      });
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full max-w-4xl mx-auto", className)}>
      <ContextBadges contexts={contexts} onRemove={onRemoveContext} />
      
      <div 
        ref={containerRef}
        className="relative flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-neutral-700 transition-all"
      >
        <div className="relative p-3 pb-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent text-neutral-200 placeholder:text-neutral-500 text-sm resize-none outline-none min-h-[24px] max-h-[240px] leading-relaxed scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
            rows={1}
            disabled={isLoading}
          />
          
          <div 
            ref={mirrorRef}
            className="absolute top-0 left-0 -z-50 opacity-0 whitespace-pre-wrap break-words pointer-events-none p-3 pb-0 text-sm leading-relaxed"
            aria-hidden="true"
          />

          {menuOpen === 'mention' && (
            <div 
              style={{ 
                position: 'absolute', 
                top: menuPosition.top + 24,
                left: menuPosition.left 
              }}
              className="z-50"
            >
              <AtMentionMenu
                items={mentionItems}
                filter={filterText}
                selectedIndex={selectedIndex}
                onSelect={(item) => {
                  const textarea = textareaRef.current;
                  if (!textarea) return;
                  const cursor = textarea.selectionStart;
                  const textBefore = value.slice(0, cursor);
                  const lastTrigger = textBefore.lastIndexOf('@');
                  if (lastTrigger !== -1) {
                    const newValue = value.slice(0, lastTrigger) + `@${item.name} ` + value.slice(cursor);
                    onChange(newValue);
                    requestAnimationFrame(() => {
                      const newCursor = lastTrigger + item.name.length + 2;
                      textarea.selectionStart = newCursor;
                      textarea.selectionEnd = newCursor;
                      textarea.focus();
                    });
                  }
                  setMenuOpen(null);
                }}
                onClose={() => setMenuOpen(null)}
                isDarkMode={true}
              />
            </div>
          )}

          {menuOpen === 'command' && (
            <div 
              style={{ 
                position: 'absolute', 
                top: menuPosition.top + 24,
                left: menuPosition.left 
              }}
              className="z-50"
            >
              <SlashCommandMenu
                commands={slashCommands}
                filter={filterText}
                selectedIndex={selectedIndex}
                onSelect={(cmd) => {
                  const textarea = textareaRef.current;
                  if (!textarea) return;
                  const cursor = textarea.selectionStart;
                  const textBefore = value.slice(0, cursor);
                  const lastTrigger = textBefore.lastIndexOf('/');
                  if (lastTrigger !== -1) {
                    const newValue = value.slice(0, lastTrigger) + `/${cmd.name} ` + value.slice(cursor);
                    onChange(newValue);
                     requestAnimationFrame(() => {
                      const newCursor = lastTrigger + cmd.name.length + 2;
                      textarea.selectionStart = newCursor;
                      textarea.selectionEnd = newCursor;
                      textarea.focus();
                    });
                  }
                  setMenuOpen(null);
                }}
                onClose={() => setMenuOpen(null)}
                isDarkMode={true}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-2 pl-3">
          <div className="flex items-center gap-2">
            <ModelSelector 
              selectedModel={model}
              onModelChange={onModelChange}
              className="hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
            />
            <button 
              className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
              title="Attach file"
              disabled={isLoading}
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {isLoading && (
              <AgentStatusIndicator status="thinking" className="mr-2" />
            )}
            
            <button
              onClick={onSend}
              disabled={!value.trim() || isLoading}
              className={cn(
                "p-2 rounded-lg transition-all duration-200 flex items-center justify-center",
                value.trim() && !isLoading
                  ? "bg-neutral-100 text-neutral-900 hover:bg-white shadow-sm"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center text-[10px] text-neutral-600 gap-4 opacity-0 focus-within:opacity-100 transition-opacity duration-300">
        <span>↵ to send</span>
        <span>⇧ ↵ for new line</span>
      </div>
    </div>
  );
}
