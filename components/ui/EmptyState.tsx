import React from 'react'
import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

export interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: LucideIcon
}

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actions?: EmptyStateAction[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actions = [],
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-6 px-4',
      icon: 16,
      iconWrapper: 'w-8 h-8 mb-2',
      title: 'text-sm',
      description: 'text-xs',
      button: 'text-xs px-3 py-1.5',
    },
    md: {
      container: 'py-10 px-6',
      icon: 24,
      iconWrapper: 'w-12 h-12 mb-3',
      title: 'text-base',
      description: 'text-sm',
      button: 'text-sm px-4 py-2',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 32,
      iconWrapper: 'w-16 h-16 mb-4',
      title: 'text-lg',
      description: 'text-base',
      button: 'text-base px-5 py-2.5',
    },
  }

  const s = sizeClasses[size]

  const buttonVariants = {
    primary: 'bg-accent text-white hover:bg-accent-hover border-transparent',
    secondary: 'bg-white/5 text-white/80 hover:bg-white/10 border-white/10',
    ghost: 'bg-transparent text-white/60 hover:text-white/80 hover:bg-white/5 border-transparent',
  }

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        s.container,
        className
      )}
    >
      {Icon && (
        <div
          className={clsx(
            'flex items-center justify-center rounded-xl bg-white/5 border border-white/10',
            s.iconWrapper
          )}
        >
          <Icon size={s.icon} className="text-white/40" />
        </div>
      )}

      <h3 className={clsx('font-medium text-white/80', s.title)}>
        {title}
      </h3>

      {description && (
        <p className={clsx('mt-1 text-white/50 max-w-xs', s.description)}>
          {description}
        </p>
      )}

      {actions.length > 0 && (
        <div className="flex items-center gap-2 mt-4">
          {actions.map((action, idx) => {
            const ActionIcon = action.icon
            return (
              <button
                key={idx}
                onClick={action.onClick}
                className={clsx(
                  'flex items-center gap-2 rounded-lg border font-medium transition-all',
                  s.button,
                  buttonVariants[action.variant || 'secondary']
                )}
              >
                {ActionIcon && <ActionIcon size={size === 'lg' ? 18 : size === 'sm' ? 12 : 14} />}
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const EmptyStateCard: React.FC<EmptyStateProps & { bordered?: boolean }> = ({
  bordered = true,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'rounded-xl',
        bordered && 'border border-dashed border-white/10 bg-white/[0.02]',
        className
      )}
    >
      <EmptyState {...props} />
    </div>
  )
}

export default EmptyState
