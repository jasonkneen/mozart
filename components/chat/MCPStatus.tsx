import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

interface MCPStatusProps {
  connected: number
  failed: number
}

export const MCPStatus: React.FC<MCPStatusProps> = ({ connected, failed }) => {
  const [isOpen, setIsOpen] = useState(false)
  const hasIssues = failed > 0

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'p-2 rounded-lg transition-colors',
          hasIssues ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
        )}
        title={`MCP servers: ${connected} connected${failed > 0 ? `, ${failed} failed` : ''}`}
        aria-label={`MCP status: ${connected} connected${failed > 0 ? `, ${failed} failed` : ''}`}
        aria-expanded={isOpen}
      >
        <AlertTriangle size={16} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-elevated border border-default rounded-lg shadow-xl overflow-hidden z-50 min-w-[200px] p-3">
          <div className="text-xs font-semibold text-white mb-1">MCP Status</div>
          <div className="text-[11px] text-white/50 mb-3">
            {connected} connected{failed > 0 && <span className="text-yellow-500">, {failed} failed</span>}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[11px] text-blue-400 hover:text-blue-300"
          >
            Read the MCP docs →
          </button>
        </div>
      )}
    </div>
  )
}

export default MCPStatus
