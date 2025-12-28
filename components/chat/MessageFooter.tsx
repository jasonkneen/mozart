import React from 'react'
import { Copy, Check, Reply, ArrowUpRight } from 'lucide-react'

export interface MessageFooterProps {
  duration?: number
  onCopy: () => void
  isCopied: boolean
  timestamp?: number
  onReply?: () => void
  formatRelativeTime: (ts: number) => string
}

export const MessageFooter: React.FC<MessageFooterProps> = ({
  duration,
  onCopy,
  isCopied,
  timestamp,
  onReply,
  formatRelativeTime
}) => {
  return (
    <div className="flex items-center gap-3 mt-3 text-white/30">
      {timestamp && (
        <span className="text-[11px]">{formatRelativeTime(timestamp)}</span>
      )}
      {duration !== undefined && (
        <>
          <span className="text-white/10">·</span>
          <span className="text-xs font-mono">{duration}s</span>
        </>
      )}
      <span className="text-white/10">·</span>
      <button
        onClick={onCopy}
        className="p-1 hover:text-white/50 transition-colors"
        title="Copy message"
        aria-label={isCopied ? 'Copied' : 'Copy message'}
      >
        {isCopied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {onReply && (
        <button
          onClick={onReply}
          className="p-1 hover:text-white/50 transition-colors"
          title="Reply"
          aria-label="Reply to message"
        >
          <Reply size={14} />
        </button>
      )}
      <button
        className="p-1 hover:text-white/50 transition-colors"
        title="Fork conversation"
        aria-label="Fork conversation"
      >
        <ArrowUpRight size={14} />
      </button>
    </div>
  )
}

export default MessageFooter
