import React, { useState } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atelierSulphurpoolDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { ChevronDown, Terminal } from 'lucide-react'
import clsx from 'clsx'
import DiffViewer from '../DiffViewer'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'executing' | 'complete' | 'error'
  result?: unknown
  error?: string
}

interface ToolInvocationBlockProps {
  toolCall: ToolCall
}

const formatResult = (result: unknown): string => {
  if (typeof result === 'string') return result
  if (result === undefined || result === null) return ''
  try {
    return JSON.stringify(result, null, 2)
  } catch (e) {
    return String(result)
  }
}

export const ToolInvocationBlock: React.FC<ToolInvocationBlockProps> = ({ toolCall }) => {
  const [isOpen, setIsOpen] = useState(false)
  const isError = toolCall.status === 'error'
  const isComplete = toolCall.status === 'complete'

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden my-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
        aria-label={`Tool: ${toolCall.name}, Status: ${toolCall.status}`}
      >
        <div className="flex items-center gap-2">
          <div className={clsx(
            "p-1 rounded",
            isError ? "bg-red-500/10 text-red-400" :
            isComplete ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
          )}>
            <Terminal size={12} />
          </div>
          <span className="text-xs font-mono text-white/70">{toolCall.name}</span>
          {isError ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">Failed</span>
          ) : isComplete ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Success</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">Running...</span>
          )}
        </div>
        <ChevronDown size={14} className={clsx("text-white/40 transition-transform", !isOpen && "-rotate-90")} />
      </button>

      {isOpen && (
        <div className="border-t border-white/10 bg-black/20">
          <div className="p-3 space-y-3">
            {/* Special handling for apply_diff args */}
            {toolCall.name === 'apply_diff' && (toolCall.args as any)?.diff ? (
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Diff Preview</div>
                <div className="bg-black/40 rounded border border-white/5 p-2 overflow-x-auto">
                  <SyntaxHighlighter
                    language="diff"
                    style={atelierSulphurpoolDark}
                    customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '12px' }}
                  >
                    {(toolCall.args as any).diff}
                  </SyntaxHighlighter>
                </div>
                <div className="mt-2 text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Arguments</div>
                <div className="bg-black/40 rounded border border-white/5 p-2 overflow-x-auto">
                  <SyntaxHighlighter
                    language="json"
                    style={atelierSulphurpoolDark}
                    customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '12px' }}
                  >
                    {JSON.stringify(toolCall.args, null, 2)}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Arguments</div>
                <div className="bg-black/40 rounded border border-white/5 p-2 overflow-x-auto">
                  <SyntaxHighlighter
                    language="json"
                    style={atelierSulphurpoolDark}
                    customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '12px' }}
                  >
                    {JSON.stringify(toolCall.args, null, 2)}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
            
            {toolCall.result && (
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Result</div>
                {/* Use DiffViewer for git_diff results */}
                {toolCall.name === 'git_diff' && typeof toolCall.result === 'string' ? (
                   <DiffViewer rawDiff={toolCall.result} />
                ) : (
                  <div className="bg-black/40 rounded border border-white/5 p-2 max-h-[300px] overflow-y-auto">
                    <SyntaxHighlighter
                      language="json"
                      style={atelierSulphurpoolDark}
                      customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '12px' }}
                      wrapLines={true}
                    >
                      {formatResult(toolCall.result)}
                    </SyntaxHighlighter>
                  </div>
                )}
              </div>
            )}
            
            {toolCall.error && (
              <div>
                <div className="text-[10px] text-red-400/60 uppercase tracking-wider mb-1.5">Error</div>
                <div className="bg-red-500/5 rounded border border-red-500/10 p-2 text-xs text-red-300 font-mono">
                  {toolCall.error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ToolInvocationBlock
