import React, { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'

// Context
interface CommandContextValue {
  search: string
  setSearch: (value: string) => void
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  items: string[]
  registerItem: (value: string) => void
  unregisterItem: (value: string) => void
}

const CommandContext = createContext<CommandContextValue | null>(null)

const useCommand = () => {
  const context = useContext(CommandContext)
  if (!context) throw new Error('Command components must be used within Command')
  return context
}

// Dialog wrapper
interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function CommandDialog({ open, onOpenChange, children }: CommandDialogProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={ref}
        className="relative w-full max-w-lg bg-[#1a1a1f] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95"
      >
        <Command>{children}</Command>
      </div>
    </div>
  )
}

// Root Command
interface CommandProps {
  children: React.ReactNode
  className?: string
}

export function Command({ children, className }: CommandProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [items, setItems] = useState<string[]>([])

  const registerItem = useCallback((value: string) => {
    setItems(prev => prev.includes(value) ? prev : [...prev, value])
  }, [])

  const unregisterItem = useCallback((value: string) => {
    setItems(prev => prev.filter(v => v !== value))
  }, [])

  return (
    <CommandContext.Provider value={{ search, setSearch, selectedIndex, setSelectedIndex, items, registerItem, unregisterItem }}>
      <div className={cn('flex flex-col', className)}>
        {children}
      </div>
    </CommandContext.Provider>
  )
}

// Input
interface CommandInputProps {
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function CommandInput({ placeholder, value, onValueChange, className }: CommandInputProps) {
  const { search, setSearch, selectedIndex, setSelectedIndex, items } = useCommand()
  const inputRef = useRef<HTMLInputElement>(null)
  
  const displayValue = value ?? search
  const handleChange = onValueChange ?? setSearch

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex - 1, 0))
    }
  }

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 border-b border-white/10', className)}>
      <Search className="w-4 h-4 text-white/40 shrink-0" />
      <input
        ref={inputRef}
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-sm"
      />
    </div>
  )
}

// List
interface CommandListProps {
  children: React.ReactNode
  className?: string
}

export function CommandList({ children, className }: CommandListProps) {
  return (
    <div className={cn('max-h-[300px] overflow-y-auto p-2', className)}>
      {children}
    </div>
  )
}

// Empty state
interface CommandEmptyProps {
  children: React.ReactNode
  className?: string
}

export function CommandEmpty({ children, className }: CommandEmptyProps) {
  const { search, items } = useCommand()
  
  // Only show if searching and no items match
  if (!search || items.length > 0) return null

  return (
    <div className={cn('py-6 text-center text-sm text-white/40', className)}>
      {children}
    </div>
  )
}

// Group
interface CommandGroupProps {
  heading?: string
  children: React.ReactNode
  className?: string
}

export function CommandGroup({ heading, children, className }: CommandGroupProps) {
  return (
    <div className={cn('py-1', className)}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
}

// Item
interface CommandItemProps {
  children: React.ReactNode
  value?: string
  onSelect?: () => void
  className?: string
}

export function CommandItem({ children, value = '', onSelect, className }: CommandItemProps) {
  const { search, selectedIndex, items, registerItem, unregisterItem } = useCommand()
  const itemIndex = items.indexOf(value)
  const isSelected = itemIndex === selectedIndex

  useEffect(() => {
    registerItem(value)
    return () => unregisterItem(value)
  }, [value, registerItem, unregisterItem])

  // Filter by search
  if (search && !value.toLowerCase().includes(search.toLowerCase())) {
    return null
  }

  const handleClick = () => {
    onSelect?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSelect?.()
    }
  }

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/80 outline-none transition-colors',
        isSelected ? 'bg-white/10 text-white' : 'hover:bg-white/5',
        className
      )}
    >
      {children}
    </button>
  )
}

// Separator
export function CommandSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-white/5', className)} />
}

// Shortcut display
interface CommandShortcutProps {
  children: React.ReactNode
  className?: string
}

export function CommandShortcut({ children, className }: CommandShortcutProps) {
  return (
    <span className={cn('ml-auto text-xs text-white/30 tracking-widest', className)}>
      {children}
    </span>
  )
}
