import React from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

export type AlertVariant = 'error' | 'warning' | 'info' | 'success'

export interface ErrorAlertProps {
  variant?: AlertVariant
  title?: string
  message: string
  onDismiss?: () => void
  onRetry?: () => void
  className?: string
  compact?: boolean
}

const variantConfig = {
  error: {
    icon: AlertCircle,
    containerClass: 'bg-error-muted border-error/20',
    iconClass: 'text-error',
    titleClass: 'text-error-text',
    messageClass: 'text-error-text/80',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-warning-muted border-warning/20',
    iconClass: 'text-warning',
    titleClass: 'text-warning-text',
    messageClass: 'text-warning-text/80',
  },
  info: {
    icon: Info,
    containerClass: 'bg-info-muted border-info/20',
    iconClass: 'text-info',
    titleClass: 'text-info-text',
    messageClass: 'text-info-text/80',
  },
  success: {
    icon: CheckCircle,
    containerClass: 'bg-success-muted border-success/20',
    iconClass: 'text-success',
    titleClass: 'text-success-text',
    messageClass: 'text-success-text/80',
  },
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  variant = 'error',
  title,
  message,
  onDismiss,
  onRetry,
  className,
  compact = false,
}) => {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 rounded-xl border transition-all animate-slide-up',
        config.containerClass,
        compact ? 'px-3 py-2' : 'px-4 py-3',
        className
      )}
    >
      <Icon
        size={compact ? 16 : 18}
        className={clsx('shrink-0 mt-0.5', config.iconClass)}
      />

      <div className="flex-1 min-w-0">
        {title && (
          <h4
            className={clsx(
              'font-medium',
              compact ? 'text-xs' : 'text-sm',
              config.titleClass
            )}
          >
            {title}
          </h4>
        )}
        <p
          className={clsx(
            title && 'mt-0.5',
            compact ? 'text-xs' : 'text-sm',
            config.messageClass
          )}
        >
          {message}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className={clsx(
              'p-1.5 rounded-lg transition-colors hover:bg-white/10',
              config.iconClass
            )}
            title="Retry"
            aria-label="Retry"
          >
            <RefreshCw size={compact ? 14 : 16} />
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={clsx(
              'p-1.5 rounded-lg transition-colors hover:bg-white/10',
              config.iconClass
            )}
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X size={compact ? 14 : 16} />
          </button>
        )}
      </div>
    </div>
  )
}

export const InlineError: React.FC<{
  message: string
  className?: string
}> = ({ message, className }) => (
  <p
    role="alert"
    className={clsx('flex items-center gap-1.5 text-xs text-error-text', className)}
  >
    <AlertCircle size={12} className="shrink-0" />
    {message}
  </p>
)

export const ToastError: React.FC<{
  message: string
  onDismiss?: () => void
  className?: string
}> = ({ message, onDismiss, className }) => (
  <div
    role="alert"
    className={clsx(
      'flex items-center gap-3 px-4 py-3 rounded-xl bg-error border border-error/30 text-white shadow-xl animate-slide-up',
      className
    )}
  >
    <AlertCircle size={18} className="shrink-0" />
    <span className="text-sm flex-1">{message}</span>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    )}
  </div>
)

export default ErrorAlert
