import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50'
    
    const variants = {
      default: 'bg-white/10 text-white hover:bg-white/20',
      ghost: 'text-white/60 hover:text-white hover:bg-white/5',
      outline: 'border border-white/10 bg-transparent text-white/80 hover:bg-white/5',
      secondary: 'bg-white/5 text-white/80 hover:bg-white/10',
      destructive: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
    }
    
    const sizes = {
      default: 'h-9 px-4 py-2 text-sm',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-10 px-6 text-base',
      icon: 'h-8 w-8 p-0',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
