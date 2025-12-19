import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white/10 text-white/80',
      secondary: 'bg-white/5 text-white/60',
      success: 'bg-green-500/20 text-green-400',
      warning: 'bg-yellow-500/20 text-yellow-400',
      destructive: 'bg-red-500/20 text-red-400',
      outline: 'border border-white/10 text-white/60',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
