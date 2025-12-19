import React, { useState, useRef, useEffect, createContext, useContext } from 'react'
import { cn } from '../../lib/utils'

// Context for dropdown state
interface DropdownContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  value?: string
  onValueChange?: (value: string) => void
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

const useDropdown = () => {
  const context = useContext(DropdownContext)
  if (!context) throw new Error('Dropdown components must be used within DropdownMenu')
  return context
}

// Root component
interface DropdownMenuProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DropdownMenu({ children, open: controlledOpen, onOpenChange }: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  )
}

// Trigger
interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

export function DropdownMenuTrigger({ children, asChild, className }: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdown()
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(!open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      'aria-expanded': open,
    })
  }

  return (
    <button onClick={handleClick} className={className} aria-expanded={open}>
      {children}
    </button>
  )
}

// Content
interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom'
  className?: string
}

export function DropdownMenuContent({ 
  children, 
  align = 'start', 
  side = 'bottom',
  className 
}: DropdownMenuContentProps) {
  const { open, setOpen } = useDropdown()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen])

  if (!open) return null

  const alignments = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  const sides = {
    top: 'bottom-full mb-1',
    bottom: 'top-full mt-1',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 min-w-[180px] overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1f] p-1 shadow-xl animate-in fade-in-0 zoom-in-95',
        alignments[align],
        sides[side],
        className
      )}
    >
      {children}
    </div>
  )
}

// Item
interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function DropdownMenuItem({ children, onClick, disabled, className }: DropdownMenuItemProps) {
  const { setOpen } = useDropdown()

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    setOpen(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/80 outline-none transition-colors',
        'hover:bg-white/5 hover:text-white focus:bg-white/5',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}

// Label
interface DropdownMenuLabelProps {
  children: React.ReactNode
  className?: string
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={cn('px-2 py-1.5 text-xs font-semibold text-white/40', className)}>
      {children}
    </div>
  )
}

// Separator
export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-white/10', className)} />
}

// Group
export function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

// Radio Group
interface DropdownMenuRadioGroupProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
}

const RadioGroupContext = createContext<{ value?: string; onValueChange?: (v: string) => void } | null>(null)

export function DropdownMenuRadioGroup({ children, value, onValueChange }: DropdownMenuRadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      {children}
    </RadioGroupContext.Provider>
  )
}

// Radio Item
interface DropdownMenuRadioItemProps {
  children: React.ReactNode
  value: string
  className?: string
}

export function DropdownMenuRadioItem({ children, value, className }: DropdownMenuRadioItemProps) {
  const { setOpen } = useDropdown()
  const radioCtx = useContext(RadioGroupContext)
  const isSelected = radioCtx?.value === value

  const handleClick = () => {
    radioCtx?.onValueChange?.(value)
    setOpen(false)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors',
        isSelected ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
        className
      )}
    >
      {children}
    </button>
  )
}
