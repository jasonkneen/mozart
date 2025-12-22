import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Zap, FileText, User, Terminal, GitBranch, Search, ClipboardList, Sparkles } from 'lucide-react'
import clsx from 'clsx'

export interface AutocompleteItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  type: 'command' | 'agent' | 'file'
}

// Default slash commands
const defaultCommands: AutocompleteItem[] = [
  { id: 'plan', label: 'plan', description: 'Create an implementation plan', icon: <ClipboardList size={14} />, type: 'command' },
  { id: 'fix', label: 'fix', description: 'Fix bugs or errors', icon: <Zap size={14} />, type: 'command' },
  { id: 'explain', label: 'explain', description: 'Explain code or concepts', icon: <Search size={14} />, type: 'command' },
  { id: 'refactor', label: 'refactor', description: 'Refactor and improve code', icon: <Sparkles size={14} />, type: 'command' },
  { id: 'test', label: 'test', description: 'Write tests for code', icon: <Terminal size={14} />, type: 'command' },
  { id: 'commit', label: 'commit', description: 'Create a git commit', icon: <GitBranch size={14} />, type: 'command' },
  { id: 'review', label: 'review', description: 'Review code changes', icon: <FileText size={14} />, type: 'command' },
]

// Default agents/mentions
const defaultAgents: AutocompleteItem[] = [
  { id: 'codebase', label: 'codebase', description: 'Search entire codebase', icon: <Search size={14} />, type: 'agent' },
  { id: 'notes', label: 'notes', description: 'Include workspace notes', icon: <FileText size={14} />, type: 'agent' },
  { id: 'architect', label: 'architect', description: 'System design agent', icon: <User size={14} />, type: 'agent' },
  { id: 'reviewer', label: 'reviewer', description: 'Code review agent', icon: <User size={14} />, type: 'agent' },
]

interface InputAutocompleteProps {
  input: string
  cursorPosition: number
  onSelect: (item: AutocompleteItem, startPos: number, endPos: number) => void
  files?: AutocompleteItem[]
  isVisible: boolean
  onVisibilityChange: (visible: boolean) => void
  inputRef: React.RefObject<HTMLTextAreaElement>
}

// Simple fuzzy match
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let qi = 0
  for (let i = 0; i < lowerText.length && qi < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[qi]) qi++
  }
  return qi === lowerQuery.length
}

export function InputAutocomplete({
  input,
  cursorPosition,
  onSelect,
  files = [],
  isVisible,
  onVisibilityChange,
  inputRef
}: InputAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Detect trigger character and query
  const { trigger, query, startPos } = useMemo(() => {
    const textBeforeCursor = input.slice(0, cursorPosition)

    // Look for / or @ trigger
    const slashMatch = textBeforeCursor.match(/(?:^|\s)(\/)([\w-]*)$/)
    const atMatch = textBeforeCursor.match(/(?:^|\s)(@)([\w-]*)$/)

    if (slashMatch) {
      return {
        trigger: '/' as const,
        query: slashMatch[2],
        startPos: textBeforeCursor.lastIndexOf('/'),
      }
    }
    if (atMatch) {
      return {
        trigger: '@' as const,
        query: atMatch[2],
        startPos: textBeforeCursor.lastIndexOf('@'),
      }
    }
    return { trigger: null, query: '', startPos: -1 }
  }, [input, cursorPosition])

  // Get filtered items based on trigger
  const items = useMemo(() => {
    if (!trigger) return []

    const sourceItems = trigger === '/' ? defaultCommands : [...defaultAgents, ...files]
    return sourceItems.filter(item => fuzzyMatch(item.label, query))
  }, [trigger, query, files])

  // Show/hide menu
  useEffect(() => {
    const shouldShow = trigger !== null && items.length > 0
    if (shouldShow !== isVisible) {
      onVisibilityChange(shouldShow)
    }
    if (shouldShow) {
      setSelectedIndex(0)
    }
  }, [trigger, items.length, isVisible, onVisibilityChange])

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => (i + 1) % items.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => (i - 1 + items.length) % items.length)
          break
        case 'Enter':
        case 'Tab':
          if (items[selectedIndex]) {
            e.preventDefault()
            handleSelect(items[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onVisibilityChange(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, items, selectedIndex])

  const handleSelect = (item: AutocompleteItem) => {
    const endPos = cursorPosition
    onSelect(item, startPos, endPos)
    onVisibilityChange(false)
  }

  if (!isVisible || items.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full mb-2 left-4 right-4 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50 max-h-64 overflow-y-auto"
    >
      <div className="p-2 text-xs text-white/40 border-b border-white/5">
        {trigger === '/' ? 'Commands' : 'Mentions'}
      </div>
      <div className="p-1">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
              index === selectedIndex
                ? 'bg-blue-500/20 text-white'
                : 'text-white/70 hover:bg-white/5'
            )}
          >
            <span className="text-white/50">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {trigger}{item.label}
              </div>
              {item.description && (
                <div className="text-xs text-white/40 truncate">{item.description}</div>
              )}
            </div>
            {index === selectedIndex && (
              <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/40">↵</kbd>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
