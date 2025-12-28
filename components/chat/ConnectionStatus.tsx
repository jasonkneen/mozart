import React from 'react'
import clsx from 'clsx'

interface ConnectionStatusProps {
  status: string
  error: string | null
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, error }) => {
  let color = 'bg-green-500'
  let label = 'Idle'
  let pulse = false

  if (error) {
    color = 'bg-red-500'
    label = 'Error'
  } else if (status === 'submitted') {
    color = 'bg-yellow-500'
    label = 'Connecting'
    pulse = true
  } else if (status === 'streaming') {
    color = 'bg-green-500'
    label = 'Streaming'
    pulse = true
  }

  return (
    <div 
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10" 
      title={`Status: ${label}`}
      role="status"
      aria-label={`Connection status: ${label}`}
    >
      <div className={clsx(
        "w-2 h-2 rounded-full transition-all",
        color,
        pulse && "animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.3)]"
      )} />
      <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider hidden sm:inline-block">
        {label}
      </span>
    </div>
  )
}

export default ConnectionStatus
