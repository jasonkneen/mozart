import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atelierSulphurpoolDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import {
  Send, Paperclip, Sparkles, ChevronDown, ListRestart, Brain, ChevronRight,
  Copy, Check, Loader, AlertCircle, Code, Zap, Settings, ImageIcon, FileText
} from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import clsx from 'clsx'

const API_BASE = (import.meta as { env?: Record<string, string> }).env?.VITE_CONDUCTOR_API_BASE || '/api'

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
}

const ChatInterface: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [extendedMessages, setExtendedMessages] = useState<ExtendedMessage[]>([])
  const [showThinkingBlocks, setShowThinkingBlocks] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('sonnet')

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: `${API_BASE}/chat`,
    onFinish: (message) => {
      setExtendedMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.findIndex(m => m.id === message.id)
        if (lastIdx >= 0) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: message.content,
            isStreaming: false,
          }
        }
        return updated
      })
    },
    onError: (error) => {
      console.error('Chat error:', error)
    },
  })

  // Parse message content into structured parts
  const parseMessageParts = useCallback((content: string, role: 'user' | 'assistant'): MessagePart[] => {
    if (role === 'user') {
      return [{ type: 'text', content }]
    }

    const parts: MessagePart[] = []
    let remaining = content

    // Extract thinking blocks
    const thinkingRegex = /<Thinking>([\s\S]*?)<\/Thinking>/g
    let thinkingMatch
    while ((thinkingMatch = thinkingRegex.exec(remaining)) !== null) {
      const before = remaining.substring(0, thinkingMatch.index)
      if (before) {
        parts.push({ type: 'text', content: before })
      }
      parts.push({ type: 'thinking', content: thinkingMatch[1].trim() })
      remaining = remaining.substring(thinkingMatch.index + thinkingMatch[0].length)
    }

    if (remaining) {
      parts.push({ type: 'text', content: remaining })
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }]
  }, [])

  // Sync AI SDK messages with extended messages
  useEffect(() => {
    const newExtendedMessages = messages.map((msg) => {
      const existing = extendedMessages.find(m => m.id === msg.id)
      if (existing) {
        return existing
      }

      const parts = parseMessageParts(msg.content, msg.role)

      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        parts,
        thinking: parts.find(p => p.type === 'thinking')?.content,
        showThinking: false,
        isStreaming: false,
      }
    })

    setExtendedMessages(newExtendedMessages)
  }, [messages, parseMessageParts])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [extendedMessages, isLoading])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handleSubmit(e)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form && input.trim()) {
        handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>)
      }
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
          // Add image or file content to message
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
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-lg text-white/40">
            <ListRestart size={14} />
            <span className="text-xs font-mono font-medium">Start a conversation</span>
          </div>
        )}

        {extendedMessages.map((msg) => (
          <div key={msg.id} className="space-y-4">
            {msg.role === 'user' ? (
              /* User Message */
              <div className="flex justify-end">
                <div className="bg-white/[0.08] border border-white/10 px-5 py-3 rounded-2xl text-[14px] font-medium text-white/90 shadow-xl max-w-[85%] leading-relaxed hover:bg-white/[0.12] transition-colors">
                  {msg.content}
                </div>
              </div>
            ) : (
              /* Assistant Message */
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {msg.thinking && (
                  <ThinkingBlock
                    content={msg.thinking}
                    isOpen={showThinkingBlocks[msg.id]}
                    onToggle={() => toggleThinking(msg.id)}
                  />
                )}

                {/* Main Content */}
                <div className="space-y-3">
                  {msg.parts.map((part, idx) => {
                    const partId = `${msg.id}-${idx}`

                    if (part.type === 'thinking') {
                      return null
                    }

                    if (part.type === 'text') {
                      return (
                        <div
                          key={partId}
                          className="prose prose-invert prose-sm max-w-none text-[15px] leading-relaxed text-white/85 font-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
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
                              table: ({ children, ...props }: any) => (
                                <div className="overflow-x-auto">
                                  <table
                                    className="border-collapse border border-white/10 text-sm"
                                    {...props}
                                  >
                                    {children}
                                  </table>
                                </div>
                              ),
                              th: ({ children, ...props }: any) => (
                                <th
                                  className="border border-white/10 bg-white/5 px-3 py-2 font-semibold text-left"
                                  {...props}
                                >
                                  {children}
                                </th>
                              ),
                              td: ({ children, ...props }: any) => (
                                <td
                                  className="border border-white/10 px-3 py-2"
                                  {...props}
                                >
                                  {children}
                                </td>
                              ),
                              h1: ({ children, ...props }: any) => (
                                <h1
                                  className="text-2xl font-bold mt-6 mb-3 text-white"
                                  {...props}
                                >
                                  {children}
                                </h1>
                              ),
                              h2: ({ children, ...props }: any) => (
                                <h2
                                  className="text-xl font-bold mt-5 mb-2 text-white"
                                  {...props}
                                >
                                  {children}
                                </h2>
                              ),
                              h3: ({ children, ...props }: any) => (
                                <h3
                                  className="text-lg font-bold mt-4 mb-2 text-white/90"
                                  {...props}
                                >
                                  {children}
                                </h3>
                              ),
                              ul: ({ children, ...props }: any) => (
                                <ul
                                  className="list-disc list-inside space-y-1 my-2"
                                  {...props}
                                >
                                  {children}
                                </ul>
                              ),
                              ol: ({ children, ...props }: any) => (
                                <ol
                                  className="list-decimal list-inside space-y-1 my-2"
                                  {...props}
                                >
                                  {children}
                                </ol>
                              ),
                              li: ({ children, ...props }: any) => (
                                <li className="ml-2" {...props}>
                                  {children}
                                </li>
                              ),
                              a: ({ children, ...props }: any) => (
                                <a
                                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                  {...props}
                                >
                                  {children}
                                </a>
                              ),
                              blockquote: ({ children, ...props }: any) => (
                                <blockquote
                                  className="border-l-4 border-blue-400/30 pl-4 italic text-white/70 my-3"
                                  {...props}
                                >
                                  {children}
                                </blockquote>
                              ),
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
                    <div className="flex items-center gap-2 text-white/40">
                      <Loader size={14} className="animate-spin" />
                      <span className="text-xs">Generating response...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-12 pt-0 max-w-5xl mx-auto w-full">
        <form
          onSubmit={handleFormSubmit}
          className="rounded-2xl border border-white/10 p-2 shadow-2xl transition-all focus-within:border-white/20 bg-white/[0.03] backdrop-blur-xl"
        >
          <div className="flex items-start px-4 pt-2 gap-3">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask to make changes, @mention files, run /commands"
              className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] text-white placeholder:text-white/20 min-h-[44px] max-h-[200px]"
              rows={1}
            />
            <span className="text-[10px] text-white/20 font-mono shrink-0 uppercase tracking-tighter pt-1">⌘L</span>
          </div>

          <div className="flex items-center justify-between px-2 py-1 mt-2">
            <div className="flex items-center gap-2">
              <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-white/40 hover:text-white/60 transition-colors hover:bg-white/5 rounded-lg"
                title="Attach file"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
                accept="image/*,.pdf,.txt,.json,.csv,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.go,.rs,.rb,.php"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={clsx(
                  'p-2.5 rounded-xl transition-all shadow-xl active:scale-90',
                  input.trim() && !isLoading
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
        <div className="prose prose-invert prose-sm max-w-none text-[13px] leading-relaxed text-white/50 font-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown
            components={{
              code: ({ className, inline, children, ...props }: any) => (
                <code
                  className={clsx(
                    inline ? 'bg-white/10 px-1.5 py-0.5 rounded text-xs' : 'block bg-white/5 p-3 rounded text-xs overflow-x-auto'
                  )}
                  {...props}
                >
                  {children}
                </code>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
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
          <>
            <Check size={14} />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>Copy</span>
          </>
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

// Component: Model Selector
interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false)

  const models = [
    { id: 'haiku', name: 'Haiku', icon: Zap, desc: 'Fast & efficient' },
    { id: 'sonnet', name: 'Sonnet', icon: Brain, desc: 'Balanced' },
    { id: 'opus', name: 'Opus', icon: Sparkles, desc: 'Most capable' },
  ]

  const current = models.find(m => m.id === selectedModel) || models[1]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs text-white/60 hover:text-white/80"
      >
        <current.icon size={14} />
        <span>{current.name}</span>
        <ChevronDown size={12} className={clsx('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 min-w-[180px]">
          {models.map(model => {
            const Icon = model.icon
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onModelChange(model.id)
                  setIsOpen(false)
                }}
                className={clsx(
                  'w-full flex items-start gap-2 px-3 py-2.5 text-xs transition-colors border-b border-white/5 last:border-b-0',
                  selectedModel === model.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                )}
              >
                <Icon size={14} className="mt-0.5 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{model.name}</div>
                  <div className="text-white/40 text-[11px]">{model.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ChatInterface
