import React, { useRef, useEffect, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atelierSulphurpoolDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import {
  Send, Paperclip, Sparkles, ChevronDown, Brain, ChevronRight,
  Copy, Check, Zap, ClipboardList, AlertTriangle, Link, ArrowUpRight
} from 'lucide-react'
const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

function BrailleSpinner() {
  const [frame, setFrame] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % BRAILLE_FRAMES.length)
    }, 80)
    return () => clearInterval(interval)
  }, [])

  return <span className="text-white/40 ml-1">{BRAILLE_FRAMES[frame]}</span>
}

// Streaming progress indicator with elapsed time
function StreamingIndicator({ startTime, thinkingLevel }: { startTime: number | null; thinkingLevel: string }) {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const thinkingLabels: Record<string, string> = {
    think: 'Thinking',
    megathink: 'Deep thinking',
    ultrathink: 'Extended reasoning'
  }

  return (
    <div className="flex items-center gap-3 text-white/40 text-sm animate-in fade-in">
      <BrailleSpinner />
      <span className="font-mono">{thinkingLabels[thinkingLevel] || 'Processing'}...</span>
      <span className="text-xs font-mono text-white/25">{elapsed}s</span>
    </div>
  )
}

interface MessageFooterProps {
  duration?: number
  content: string
  onCopy: () => void
  isCopied: boolean
}

function MessageFooter({ duration, content, onCopy, isCopied }: MessageFooterProps) {
  return (
    <div className="flex items-center gap-3 mt-3 text-white/30">
      {duration !== undefined && (
        <span className="text-xs font-mono">{duration}s</span>
      )}
      <span className="text-white/10">·</span>
      <button
        onClick={onCopy}
        className="p-1 hover:text-white/50 transition-colors"
        title="Copy message"
      >
        {isCopied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <button
        className="p-1 hover:text-white/50 transition-colors"
        title="Fork conversation"
      >
        <ArrowUpRight size={14} />
      </button>
    </div>
  )
}
import { useChat, UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import clsx from 'clsx'
import { useConductorStore } from '../services/store'
import { InputAutocomplete, AutocompleteItem } from './InputAutocomplete'

const API_BASE = (import.meta as any).env?.VITE_CONDUCTOR_API_BASE || '/api'

interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'executing' | 'complete' | 'error'
  result?: unknown
  error?: string
}

interface MessagePart {
  type: 'text' | 'code' | 'thinking' | 'tool_call' | 'artifact' | 'image'
  content: string
  language?: string
  filename?: string
  toolCall?: ToolCall
}

interface ExtendedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  parts: MessagePart[]
  thinking?: string
  showThinking?: boolean
  toolCalls?: ToolCall[]
  artifacts?: Array<{ type: string; content: string; filename: string }>
  images?: string[]
  isStreaming?: boolean
  startTime?: number
  duration?: number
}

interface ChatInterfaceProps {
  tabId: string
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ tabId }) => {
  const { state } = useConductorStore()
  const { activeWorkspaceId, workspaces } = state
  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [extendedMessages, setExtendedMessages] = useState<ExtendedMessage[]>([])
  const [showThinkingBlocks, setShowThinkingBlocks] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('sonnet')
  const [input, setInput] = useState('')
  const [thinkingLevel, setThinkingLevel] = useState<'think' | 'megathink' | 'ultrathink'>('think')
  const [planMode, setPlanMode] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [submitTime, setSubmitTime] = useState<number | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Timeout duration based on thinking level (extended thinking needs more time)
  const getTimeoutMs = () => {
    switch (thinkingLevel) {
      case 'ultrathink': return 5 * 60 * 1000  // 5 minutes
      case 'megathink': return 3 * 60 * 1000   // 3 minutes
      default: return 2 * 60 * 1000            // 2 minutes
    }
  }

  // Transport needs to be recreated when planMode/model/level changes
  const chatTransport = React.useMemo(() => new DefaultChatTransport({
    api: `${API_BASE}/chat`,
    body: {
      model: selectedModel,
      level: thinkingLevel === 'think' ? 'Think' : thinkingLevel === 'megathink' ? 'Megathink' : 'Ultrathink',
      planMode,
    },
  }), [selectedModel, thinkingLevel, planMode])

  const { messages, sendMessage, status, setMessages } = useChat({
    id: tabId,
    transport: chatTransport,
    onFinish: ({ message }: { message: UIMessage }) => {
      const duration = submitTime ? Math.round((Date.now() - submitTime) / 1000) : undefined
      setIsSubmitting(false)
      setSubmitTime(null)
      // Clear abort controller on success
      abortControllerRef.current = null
      setExtendedMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.findIndex(m => m.id === message.id)
        if (lastIdx >= 0) {
          const textContent = message.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map(p => p.text)
            .join('')
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: textContent,
            isStreaming: false,
            duration,
          }
        }
        return updated
      })
    },
    onError: (error) => {
      setIsSubmitting(false)
      setSubmitTime(null)

      // Handle different error types
      if (error.name === 'AbortError' || error.message?.includes('abort')) {
        setRequestError('Request timed out. Try a shorter message or lower thinking level.')
      } else if (error.message?.includes('401') || error.message?.includes('Authentication')) {
        setRequestError('Authentication required. Please login first.')
      } else {
        setRequestError(error.message || 'Failed to get response')
      }

      console.error('Chat error:', error)
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Parse message content into structured parts
  const parseMessageParts = useCallback((content: string, role: 'user' | 'assistant'): MessagePart[] => {
    if (role === 'user') {
      return [{ type: 'text', content }]
    }

    const parts: MessagePart[] = []
    let remaining = content

    // Extract thinking blocks
    const thinkingRegex = /<Thinking>([\s\S]*?)<\/Thinking>/g
    let thinkingMatch: RegExpExecArray | null
    while ((thinkingMatch = thinkingRegex.exec(remaining)) !== null) {
      const before = remaining.substring(0, thinkingMatch.index)
      if (before) {
        parts.push({ type: 'text', content: before })
      }
      parts.push({ type: 'thinking', content: thinkingMatch[1]?.trim() || '' })
      remaining = remaining.substring(thinkingMatch.index + thinkingMatch[0].length)
    }

    if (remaining) {
      parts.push({ type: 'text', content: remaining })
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }]
  }, [])

  // Helper to extract text content from UIMessage parts
  const getMessageContent = useCallback((msg: UIMessage): string => {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('')
  }, [])

  // Sync AI SDK messages with extended messages
  useEffect(() => {
    setExtendedMessages(prev => {
      const newExtendedMessages = messages.map((msg) => {
        const existing = prev.find(m => m.id === msg.id)
        const rawContent = getMessageContent(msg)
        
        if (existing && !isLoading && !rawContent.includes('<Thinking>') && existing.content === rawContent) {
          return existing
        }

        const parts = parseMessageParts(rawContent, msg.role as 'user' | 'assistant')

        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: rawContent,
          parts,
          thinking: parts.find(p => p.type === 'thinking')?.content,
          showThinking: existing?.showThinking ?? false,
          isStreaming: isLoading && msg.id === messages[messages.length - 1]?.id,
        }
      })
      return newExtendedMessages
    })
  }, [messages, parseMessageParts, isLoading, getMessageContent])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [extendedMessages, isLoading])

  useEffect(() => {
    if (status === 'streaming') {
      setIsSubmitting(false)
      // Clear timeout when streaming starts - we got a response
      abortControllerRef.current = null
    }
  }, [status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // ⌘L to focus input, ⇧Tab to toggle plan mode
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.shiftKey && e.key === 'Tab') {
        e.preventDefault()
        setPlanMode(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim() && !isLoading && !isSubmitting) {
      let content = input.trim()

      if (content === '/clear') {
        setMessages([])
        setInput('')
        setRequestError(null)
        return
      }

      if (content.includes('@notes') && activeWorkspace?.notes) {
        content = content.replace('@notes', `\n\n<notes>\n${activeWorkspace.notes}\n</notes>`)
      }

      // Clear any previous errors
      setRequestError(null)

      // Set up timeout for the request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          setRequestError('Request timed out. Try a shorter message or lower thinking level.')
          setIsSubmitting(false)
          setSubmitTime(null)
        }
      }, getTimeoutMs())

      setIsSubmitting(true)
      setSubmitTime(Date.now())
      setInput('')
      sendMessage({ text: content })

      // Clean up timeout when streaming starts or completes
      const cleanup = () => clearTimeout(timeoutId)
      setTimeout(cleanup, getTimeoutMs() + 1000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Use same logic as form submit - create synthetic form event
      handleFormSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>)
    }
  }

  const toggleThinking = (msgId: string) => {
    setShowThinkingBlocks(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }))
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result
        if (typeof result === 'string') {
          console.log('File loaded:', file.name)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0A0A0A] relative overflow-hidden">
      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-12 space-y-8 max-w-5xl mx-auto w-full scroll-smooth scrollbar-hide min-h-0"
      >
        {extendedMessages.length === 0 && (
          <div className="pt-6">
            <p className="text-white/50 text-sm mb-4">
              New chat in <span className="font-mono text-white/70">/{activeWorkspace?.location || 'workspace'}</span>. Add context:
            </p>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
              <Sparkles size={12} className="text-white/50" />
              <span className="text-xs font-medium">Claude</span>
            </button>
          </div>
        )}

        {extendedMessages.map((msg, msgIndex) => {
          const turnNumber = Math.floor(msgIndex / 2) + 1
          return (
          <div key={msg.id} className="relative">
            <div className="absolute -left-8 top-0 text-xs font-mono text-white/20 select-none">
              {msg.role === 'assistant' && turnNumber}
            </div>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-white/[0.08] border border-white/10 px-5 py-3 rounded-2xl text-[14px] font-medium text-white/90 shadow-xl max-w-[85%] leading-relaxed hover:bg-white/[0.12] transition-colors">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {msg.thinking && (
                  <ThinkingBlock
                    content={msg.thinking}
                    isOpen={showThinkingBlocks[msg.id]}
                    onToggle={() => toggleThinking(msg.id)}
                  />
                )}

                <div className="space-y-3">
                  {msg.parts.map((part, idx) => {
                    const partId = `${msg.id}-${idx}`
                    if (part.type === 'thinking') return null
                    if (part.type === 'text') {
                      return (
                        <div
                          key={partId}
                          className="prose prose-invert prose-sm max-w-none text-[15px] leading-relaxed text-white/85 font-normal"
                        >
                          <ReactMarkdown
                            components={{
                              code: ({ className, children, inline, ...props }: any) => {
                                if (inline) {
                                  return (
                                    <code
                                      className="bg-white/15 px-1.5 py-0.5 rounded text-sm font-mono"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  )
                                }
                                const match = /language-(\w+)/.exec(className || '')
                                const language = match ? match[1] : 'text'
                                const code = String(children).replace(/\n$/, '')
                                return (
                                  <CodeBlock
                                    code={code}
                                    language={language}
                                    onCopy={() => copyToClipboard(code, partId)}
                                    isCopied={copiedId === partId}
                                  />
                                )
                              },
                            }}
                          >
                            {part.content}
                          </ReactMarkdown>
                        </div>
                      )
                    }
                    return null
                  })}

                  {isLoading && msg.isStreaming && (
                    <BrailleSpinner />
                  )}

                  {!msg.isStreaming && msg.content && (
                    <MessageFooter
                      duration={msg.duration}
                      content={msg.content}
                      onCopy={() => copyToClipboard(msg.content, `msg-${msg.id}`)}
                      isCopied={copiedId === `msg-${msg.id}`}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )})}
        

        {(isSubmitting || isLoading) && !extendedMessages.some(m => m.isStreaming) && (
          <StreamingIndicator startTime={submitTime} thinkingLevel={thinkingLevel} />
        )}

        {requestError && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{requestError}</span>
            <button
              onClick={() => setRequestError(null)}
              className="ml-auto text-red-400 hover:text-red-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-12 pt-0 max-w-5xl mx-auto w-full">
        <form
          onSubmit={handleFormSubmit}
          className={clsx(
            "rounded-2xl border p-2 shadow-2xl transition-all bg-white/[0.03] backdrop-blur-xl",
            planMode ? "plan-mode-border" : "border-white/10 focus-within:border-white/20"
          )}
        >
          {/* Autocomplete dropdown */}
          <InputAutocomplete
            input={input}
            cursorPosition={cursorPosition}
            onSelect={(item, startPos, endPos) => {
              // Replace the trigger + query with the selected item
              const before = input.slice(0, startPos)
              const after = input.slice(endPos)
              const insertion = item.type === 'command'
                ? `/${item.label} `
                : `@${item.label} `
              const newInput = before + insertion + after
              setInput(newInput)
              // Move cursor after insertion
              const newPos = startPos + insertion.length
              setCursorPosition(newPos)
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.selectionStart = newPos
                  inputRef.current.selectionEnd = newPos
                  inputRef.current.focus()
                }
              }, 0)
            }}
            isVisible={showAutocomplete}
            onVisibilityChange={setShowAutocomplete}
            inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
          />

          <div className="flex items-start px-4 pt-2 gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setCursorPosition(e.target.selectionStart || 0)
              }}
              onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 100)}
              placeholder="Ask to make changes, @mention files, run /commands"
              className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] text-white placeholder:text-white/20 min-h-[44px] max-h-[200px]"
              rows={1}
            />
            {!inputFocused && (
              <span className="text-[10px] text-white/20 font-mono shrink-0 uppercase tracking-tighter pt-1">⌘L</span>
            )}
          </div>

          <div className="flex items-center justify-between px-2 py-1 mt-2">
            <div className="flex items-center gap-1">
              <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
              <button
                type="button"
                onClick={() => setPlanMode(!planMode)}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  planMode ? 'text-blue-400 bg-blue-500/10' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                )}
                title="Plan mode (⇧Tab)"
              >
                <ClipboardList size={16} />
              </button>
              <ThinkingLevelSelector level={thinkingLevel} onChange={setThinkingLevel} />
              <MCPStatus connected={3} failed={0} />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-2 text-white/40 hover:text-white/60 transition-colors hover:bg-white/5 rounded-lg"
                title="Linear (⌘I)"
              >
                <Link size={16} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-white/40 hover:text-white/60 transition-colors hover:bg-white/5 rounded-lg"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <button
                type="submit"
                disabled={!input?.trim() || isLoading}
                className={clsx(
                  'p-2.5 rounded-xl transition-all shadow-xl active:scale-90',
                  input?.trim() && !isLoading
                    ? 'bg-blue-500/30 hover:bg-blue-500/40 text-blue-300'
                    : 'bg-white/10 text-white/40'
                )}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// Component: Thinking Block
interface ThinkingBlockProps {
  content: string
  isOpen: boolean
  onToggle: () => void
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isOpen, onToggle }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-xs font-medium text-white/60 group"
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

// Component: Code Block with Copy Button
interface CodeBlockProps {
  code: string
  language: string
  onCopy: () => void
  isCopied: boolean
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, onCopy, isCopied }) => (
  <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden my-3 group">
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
      <span className="text-xs text-white/40 font-mono uppercase tracking-wide">{language || 'text'}</span>
      <button
        onClick={onCopy}
        type="button"
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
      >
        {isCopied ? (
          <><Check size={14} /><span>Copied</span></>
        ) : (
          <><Copy size={14} /><span>Copy</span></>
        )}
      </button>
    </div>
    <div className="overflow-x-auto max-h-[600px]">
      <SyntaxHighlighter
        language={language || 'text'}
        style={atelierSulphurpoolDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '13px',
          lineHeight: '1.5',
          backgroundColor: 'transparent',
        }}
        wrapLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  </div>
)

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const modelGroups = [
    {
      name: 'Claude Code',
      icon: Sparkles,
      models: [
        { id: 'opus', name: 'Opus 4.5', desc: 'Most capable' },
        { id: 'sonnet', name: 'Sonnet 4.5', desc: 'Balanced' },
        { id: 'haiku', name: 'Haiku 4.5', desc: 'Fast & efficient' },
      ]
    },
    {
      name: 'Codex',
      icon: Zap,
      models: [
        { id: 'gpt-5.2-codex', name: 'GPT-5.2-Codex', desc: 'Latest', isNew: true },
        { id: 'gpt-5.2', name: 'GPT-5.2', desc: 'Standard' },
        { id: 'gpt-5.1-codex-max', name: 'GPT-5.1-Codex-Max', desc: 'Extended context' },
      ]
    }
  ]
  
  const allModels = modelGroups.flatMap(g => g.models)
  const current = allModels.find(m => m.id === selectedModel) || modelGroups[0].models[1]
  const currentGroup = modelGroups.find(g => g.models.some(m => m.id === selectedModel)) || modelGroups[0]
  const GroupIcon = currentGroup.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs text-white/60 hover:text-white/80"
      >
        <GroupIcon size={14} />
        <span>{current.name}</span>
        <ChevronDown size={12} className={clsx('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 min-w-[200px]">
          {modelGroups.map((group, groupIdx) => (
            <div key={group.name}>
              <div className="px-3 py-2 text-[10px] font-semibold text-white/40 uppercase tracking-wider bg-white/[0.02]">
                {group.name}
              </div>
              {group.models.map(model => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onModelChange(model.id)
                    setIsOpen(false)
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                    selectedModel === model.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  <group.icon size={14} className="shrink-0 text-white/40" />
                  <span className="flex-1 text-left">{model.name}</span>
                  {model.isNew && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400 rounded">New</span>
                  )}
                  {selectedModel === model.id && <Check size={14} className="text-white/60" />}
                </button>
              ))}
              {groupIdx < modelGroups.length - 1 && <div className="border-t border-white/5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface ThinkingLevelSelectorProps {
  level: 'think' | 'megathink' | 'ultrathink'
  onChange: (level: 'think' | 'megathink' | 'ultrathink') => void
}

const ThinkingLevelSelector: React.FC<ThinkingLevelSelectorProps> = ({ level, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const levels = [
    { id: 'think' as const, name: 'Think', desc: 'Basic reasoning' },
    { id: 'megathink' as const, name: 'Megathink', desc: 'Deeper analysis' },
    { id: 'ultrathink' as const, name: 'Ultrathink', desc: 'Maximum reasoning' },
  ]
  const current = levels.find(l => l.id === level) || levels[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors"
        title="Adjust thinking level"
      >
        <Brain size={16} />
        <span className="text-[10px] font-medium">:</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
          <div className="px-3 py-2 text-[10px] text-white/40">Adjust thinking level</div>
          {levels.map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onChange(l.id)
                setIsOpen(false)
              }}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                level === l.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
              )}
            >
              <Brain size={14} />
              <span className="mr-1">:</span>
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface MCPStatusProps {
  connected: number
  failed: number
}

const MCPStatus: React.FC<MCPStatusProps> = ({ connected, failed }) => {
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
      >
        <AlertTriangle size={16} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 min-w-[200px] p-3">
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

export default ChatInterface
