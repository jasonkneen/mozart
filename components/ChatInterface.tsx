import React, { useRef, useEffect, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Send, Paperclip, Sparkles,
  Copy, Check, ClipboardList, Link, Shield, ShieldOff,
  Reply, X, AlertTriangle
} from 'lucide-react'
import { useChat, UIMessage } from '@ai-sdk/react'
import {
  BrailleSpinner,
  StreamingIndicator,
  MessageFooter,
  ToolInvocationBlock,
  ThinkingBlock,
  ModelSelector,
  MCPStatus,
  ConnectionStatus,
  type ToolCall
} from './chat'
import { DefaultChatTransport } from 'ai'
import clsx from 'clsx'
import { useConductorStore } from '../services/store'
import { InputAutocomplete } from './InputAutocomplete'
import { ToolApprovalCard } from './ToolApprovalCard'
import { useToolApproval } from '../hooks/useToolApproval'
import { useSettings } from '../hooks/useSettings'

import { CodeBlock } from './CodeBlock'
import { ThinkingLevel } from '../types'
import ThinkingToggle from './ThinkingToggle'
import { PlanProgress } from './PlanProgress'

const API_BASE = (import.meta as any).env?.VITE_CONDUCTOR_API_BASE || '/api'

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
  timestamp?: number
  replyToId?: string
  plan?: {
    title: string
    description: string
    steps: { label: string; details: string; completed: boolean }[]
  }
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface ChatInterfaceProps {
  tabId: string
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ tabId }) => {
  const { state } = useConductorStore()
  const { settings } = useSettings()
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
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(ThinkingLevel.Low)
  const [planMode, setPlanMode] = useState(false)
  const [toolApprovalEnabled, setToolApprovalEnabled] = useState(false) // AI SDK 6.0 human-in-the-loop (disabled by default)
  const [inputFocused, setInputFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [submitTime, setSubmitTime] = useState<number | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; role: string } | null>(null)
  const [lastUsage, setLastUsage] = useState<{ promptTokens: number; completionTokens: number; totalTokens: number } | undefined>(undefined)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Tool approval hook (AI SDK 6.0)
  const {
    pendingApprovals,
    approve: approveToolCall,
    reject: rejectToolCall,
  } = useToolApproval({
    enabled: toolApprovalEnabled,
    onApprovalRequest: (request) => {
      console.log('Tool approval requested:', request.toolName);
    },
  });

  // Timeout duration based on thinking level (extended thinking needs more time)
  const getTimeoutMs = () => {
    switch (thinkingLevel) {
      case ThinkingLevel.Megathink: return 10 * 60 * 1000  // 10 minutes
      case ThinkingLevel.High: return 5 * 60 * 1000        // 5 minutes
      case ThinkingLevel.Medium: return 3 * 60 * 1000      // 3 minutes
      default: return 2 * 60 * 1000            // 2 minutes
    }
  }

  // Get workspace path for tool execution
  const workspacePath = activeWorkspace?.workspacePath || activeWorkspace?.location || ''

  // Transport needs to be recreated when planMode/model/level/toolApproval/workspace changes
  const chatTransport = React.useMemo(() => new DefaultChatTransport({
    api: `${API_BASE}/chat`,
    body: {
      model: selectedModel,
      level: thinkingLevel,
      planMode,
      toolApproval: toolApprovalEnabled, // AI SDK 6.0 human-in-the-loop
      temperature: settings.claude.temperature,
      topP: settings.claude.topP,
      workspacePath, // Pass workspace path for tool execution context
    },
  }), [selectedModel, thinkingLevel, planMode, toolApprovalEnabled, settings.claude.temperature, settings.claude.topP, workspacePath])

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: tabId,
    transport: chatTransport,
    onFinish: ({ message }) => {
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
        
        if (existing && !isLoading && !rawContent.includes('<Thinking>') && existing.content === rawContent && existing.toolCalls?.length === (msg as any).toolInvocations?.length) {
          return existing
        }

        const parts = parseMessageParts(rawContent, msg.role as 'user' | 'assistant')
        
        // Check for native reasoning in parts (AI SDK 6.0)
        const nativeReasoningPart = msg.parts?.find((p: any) => p.type === 'reasoning')
        const nativeReasoning = nativeReasoningPart ? (nativeReasoningPart as any).reasoning : undefined

        // Map tool invocations from AI SDK
        const toolCalls = (msg as any).toolInvocations?.map((inv: any) => ({
          id: inv.toolCallId,
          name: inv.toolName,
          args: inv.args,
          status: inv.state === 'result' ? 'complete' : 'executing',
          result: inv.result,
        }))

        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: rawContent,
          parts,
          thinking: nativeReasoning || parts.find(p => p.type === 'thinking')?.content,
          showThinking: existing?.showThinking ?? false,
          toolCalls,
          isStreaming: isLoading && msg.id === messages[messages.length - 1]?.id,
          timestamp: existing?.timestamp ?? Date.now(),
          replyToId: existing?.replyToId,
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
          stop() // Stop the chat stream
          setRequestError('Request timed out. Try a shorter message or lower thinking level.')
          setIsSubmitting(false)
          setSubmitTime(null)
        }
      }, getTimeoutMs())

      setIsSubmitting(true)
      setSubmitTime(Date.now())

      // Track reply context
      const currentReplyTo = replyingTo
      setInput('')
      setReplyingTo(null)

      sendMessage({ text: content })

      // Mark the new user message as a reply
      if (currentReplyTo) {
        setTimeout(() => {
          setExtendedMessages(prev => {
            const updated = [...prev]
            // Find the latest user message and mark it as a reply
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === 'user' && !updated[i].replyToId) {
                updated[i] = { ...updated[i], replyToId: currentReplyTo.id }
                break
              }
            }
            return updated
          })
        }, 100)
      }

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
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface relative overflow-hidden">
      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-8 max-w-5xl mx-auto w-full scroll-smooth scrollbar-hide min-h-0"
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
              <div className="flex justify-end group">
                <div className="flex flex-col items-end gap-1.5 max-w-[85%]">
                  {/* Reply context if replying to a message */}
                  {msg.replyToId && (() => {
                    const replyMsg = extendedMessages.find(m => m.id === msg.replyToId)
                    return replyMsg ? (
                      <div className="text-xs text-white/40 flex items-center gap-1.5 mr-2">
                        <Reply size={12} className="rotate-180" />
                        <span className="truncate max-w-[200px]">
                          {replyMsg.content.slice(0, 50)}{replyMsg.content.length > 50 ? '...' : ''}
                        </span>
                      </div>
                    ) : null
                  })()}
                  <div className="bg-white/[0.08] border border-white/10 px-5 py-3 rounded-2xl text-[14px] font-medium text-white/90 shadow-xl leading-relaxed hover:bg-white/[0.12] transition-colors">
                    {msg.content}
                  </div>
                  {/* User message footer */}
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-[11px] text-white/30">{formatRelativeTime(msg.timestamp || Date.now())}</span>
                    <button
                      onClick={() => copyToClipboard(msg.content, `user-${msg.id}`)}
                      className="p-1 text-white/20 hover:text-white/50 transition-colors"
                      title="Copy"
                    >
                      {copiedId === `user-${msg.id}` ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo({ id: msg.id, content: msg.content, role: msg.role })
                        inputRef.current?.focus()
                      }}
                      className="p-1 text-white/20 hover:text-white/50 transition-colors"
                      title="Reply"
                    >
                      <Reply size={12} />
                    </button>
                  </div>
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
                  {msg.plan && (
                    <PlanProgress plan={msg.plan} />
                  )}

                  {/* Tool Calls */}
                  {msg.toolCalls?.map((toolCall) => (
                    <ToolInvocationBlock
                      key={toolCall.id}
                      toolCall={toolCall}
                    />
                  ))}

                  {msg.parts.map((part, idx) => {
                    const partId = `${msg.id}-${idx}`
                    if (part.type === 'thinking') return null
                    if (part.type === 'text') {
                      // Fix common markdown formatting issues
                      const fixedContent = part.content
                        .replace(/([.!?])##/g, '$1\n\n##')  // Add newline before headings
                        .replace(/([.!?])#/g, '$1\n\n#')    // Same for any heading level
                        .replace(/\n##/g, '\n\n##')         // Ensure double newline before h2
                        .replace(/\n#/g, '\n\n#')           // Ensure double newline before any heading

                      return (
                        <div
                          key={partId}
                          className="prose prose-invert prose-sm max-w-none text-[15px] leading-relaxed text-white/85 font-normal"
                        >
                          <ReactMarkdown
                            components={{
                              code: ({ className, children, inline, node, ...props }: any) => {
                                const code = String(children).replace(/\n$/, '')
                                // Treat as inline if: explicitly inline, no language, single line, or short content
                                const isShortCode = !code.includes('\n') && code.length < 100
                                const hasLanguage = className && /language-(\w+)/.test(className)
                                const shouldBeInline = inline || (!hasLanguage && isShortCode)

                                if (shouldBeInline) {
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
                                return (
                                  <CodeBlock
                                    code={code}
                                    language={language}
                                    onCopy={() => copyToClipboard(code, partId)}
                                    isCopied={copiedId === partId}
                                  />
                                )
                              },
                              // Better heading spacing
                              h1: ({ children }) => <h1 className="text-xl font-semibold mt-6 mb-3 text-white">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2 text-white">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2 text-white">{children}</h3>,
                              // Better list styling
                              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-3">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-3">{children}</ol>,
                              li: ({ children }) => <li className="text-white/80">{children}</li>,
                              // Better paragraph spacing
                              p: ({ children }) => <p className="my-2">{children}</p>,
                              // Pre blocks for file trees
                              pre: ({ children }) => <pre className="bg-white/5 rounded-lg p-3 my-3 overflow-x-auto text-sm font-mono">{children}</pre>,
                            }}
                          >
                            {fixedContent}</ReactMarkdown>
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
                      onCopy={() => copyToClipboard(msg.content, `msg-${msg.id}`)}
                      isCopied={copiedId === `msg-${msg.id}`}
                      timestamp={msg.timestamp}
                      formatRelativeTime={formatRelativeTime}
                      onReply={() => {
                        setReplyingTo({ id: msg.id, content: msg.content, role: msg.role })
                        inputRef.current?.focus()
                      }}
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

      {/* Tool Approval Cards (AI SDK 6.0) */}
      {pendingApprovals.length > 0 && (
        <div className="px-6 pb-3 max-w-5xl mx-auto w-full space-y-3">
          {pendingApprovals.map((request) => (
            <ToolApprovalCard
              key={request.approvalId}
              request={request}
              onApprove={approveToolCall}
              onReject={rejectToolCall}
            />
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="px-6 pb-4 max-w-5xl mx-auto w-full" style={{ marginBottom: '15px' }}>
        {/* Reply preview */}
        {replyingTo && (
          <div className="mb-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
            <Reply size={14} className="text-white/40 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-white/40 uppercase tracking-wide">
                Replying to {replyingTo.role}
              </span>
              <p className="text-sm text-white/60 truncate">
                {replyingTo.content.slice(0, 100)}{replyingTo.content.length > 100 ? '...' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 text-white/40 hover:text-white/60 transition-colors"
              title="Cancel reply"
            >
              <X size={16} />
            </button>
          </div>
        )}
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
              <button
                type="button"
                onClick={() => setToolApprovalEnabled(!toolApprovalEnabled)}
                className={clsx(
                  'p-2 rounded-lg transition-colors flex items-center gap-1',
                  toolApprovalEnabled ? 'text-green-400 bg-green-500/10' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                )}
                title={toolApprovalEnabled ? 'Tool approval enabled (click to disable)' : 'Tool approval disabled (click to enable)'}
              >
                {toolApprovalEnabled ? <Shield size={16} /> : <ShieldOff size={16} />}
              </button>
              <ThinkingToggle level={thinkingLevel} onChange={setThinkingLevel} usage={lastUsage} />
              <MCPStatus connected={3} failed={0} />
              <ConnectionStatus status={status} error={requestError} />
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

export default ChatInterface
