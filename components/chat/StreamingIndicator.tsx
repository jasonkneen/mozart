import React, { useState, useEffect } from 'react'
import { BrailleSpinner } from './BrailleSpinner'

interface StreamingIndicatorProps {
  startTime: number | null
  thinkingLevel: string
}

const thinkingLabels: Record<string, string> = {
  low: 'Thinking',
  medium: 'Deep thinking',
  high: 'Complex reasoning',
  megathink: 'Extended reasoning'
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ startTime, thinkingLevel }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return (
    <div className="flex items-center gap-3 text-white/40 text-sm animate-in fade-in">
      <BrailleSpinner />
      <span className="font-mono">{thinkingLabels[thinkingLevel] || 'Processing'}...</span>
      <span className="text-xs font-mono text-white/25">{elapsed}s</span>
    </div>
  )
}

export default StreamingIndicator
