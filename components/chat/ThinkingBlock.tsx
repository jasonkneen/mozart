import React from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronRight, Brain } from 'lucide-react'
import clsx from 'clsx'

interface ThinkingBlockProps {
  content: string
  isOpen: boolean
  onToggle: () => void
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isOpen, onToggle }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-xs font-medium text-white/60 group"
      aria-expanded={isOpen}
      aria-label={`Thinking process, ${content.length} characters`}
    >
      <ChevronRight
        size={14}
        className={clsx('transition-transform', isOpen && 'rotate-90')}
      />
      <Brain size={14} className="text-purple-400/60" />
      <span>Thinking Process</span>
      <div className="ml-auto text-white/40 text-xs">
        {content.length} chars
      </div>
    </button>

    {isOpen && (
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02] max-h-[500px] overflow-y-auto">
        <div className="prose prose-invert prose-sm max-w-none text-[13px] leading-relaxed text-white/50 font-normal">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    )}
  </div>
)

export default ThinkingBlock
