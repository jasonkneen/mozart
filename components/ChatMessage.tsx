import React, { useMemo, useState } from 'react';
import { User, Sparkles, Terminal, Copy, Check, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import { Message, ToolUsage } from '../types';
import { MessageActions } from './MessageActions';
import { CodeBlock } from './ai-elements/code-block';
import { Button } from './ui/button';

export interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onFork?: () => void;
  onCopy?: (content: string) => void;
  isLast?: boolean;
}

type ParsedPart = 
  | { type: 'text'; content: string }
  | { type: 'code'; language: string; content: string };

const parseMarkdown = (content: string): ParsedPart[] => {
  if (!content) return [];
  
  const parts: ParsedPart[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return parts;
};

const FormattedText = ({ content }: { content: string }) => {
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, i) => {
        if (!paragraph.trim()) return null;

        const renderSegment = (text: string) => {
          const codeParts = text.split(/`([^`]+)`/);
          return codeParts.map((part, index) => {
            if (index % 2 === 1) {
              return <code key={index} className="px-1.5 py-0.5 rounded bg-neutral-800/50 text-neutral-300 font-mono text-xs border border-neutral-700/50">{part}</code>;
            }
            
            const boldParts = part.split(/\*\*([^*]+)\*\*/);
            return boldParts.map((boldPart, boldIndex) => {
              if (boldIndex % 2 === 1) {
                return <strong key={`${index}-${boldIndex}`} className="font-semibold text-neutral-200">{boldPart}</strong>;
              }

              const italicParts = boldPart.split(/\*([^*]+)\*/);
              return italicParts.map((italicPart, italicIndex) => {
                if (italicIndex % 2 === 1) {
                  return <em key={`${index}-${boldIndex}-${italicIndex}`} className="italic text-neutral-300">{italicPart}</em>;
                }
                
                const linkParts = italicPart.split(/\[([^\]]+)\]\(([^)]+)\)/);
                if (linkParts.length > 1) {
                    const elements: (string | React.ReactNode)[] = [];
                    for(let k=0; k<linkParts.length; k+=3) {
                        elements.push(linkParts[k]);
                        if(k+1 < linkParts.length) {
                            elements.push(
                                <a 
                                    key={`${index}-${boldIndex}-${italicIndex}-${k}`} 
                                    href={linkParts[k+2]} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline decoration-blue-400/30 underline-offset-2"
                                >
                                    {linkParts[k+1]}
                                </a>
                            );
                        }
                    }
                    return elements;
                }

                return italicPart;
              });
            });
          });
        };

        return <p key={i} className="leading-relaxed whitespace-pre-wrap">{renderSegment(paragraph)}</p>;
      })}
    </div>
  );
};

const formatToolResult = (result: unknown): string => {
  if (typeof result === 'string') return result;
  if (result === undefined || result === null) return '';
  try {
    return JSON.stringify(result, null, 2) || '';
  } catch (e) {
    return String(result);
  }
};

const ToolUsageBlock = ({ tools }: { tools: ToolUsage[] }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!tools || tools.length === 0) return null;

  return (
    <div className="mt-3 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800/50 transition-colors text-xs font-medium text-neutral-500 uppercase tracking-wider"
        >
          <Wrench className="w-3 h-3" />
          <span>Used {tools.length} Tool{tools.length > 1 ? 's' : ''}</span>
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-2 pl-2 border-l border-neutral-800">
          {tools.map((tool, index) => (
            <div 
              key={`${tool.id}-${index}`} 
              className="bg-neutral-900/50 border border-neutral-800/50 rounded-md overflow-hidden text-xs"
            >
              <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 border-b border-neutral-800/50">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-mono text-neutral-300">{tool.name}</span>
                </div>
                {tool.isError ? (
                  <span className="flex items-center gap-1 text-red-400 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-400/10">
                     Failed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-400/10">
                     Success
                  </span>
                )}
              </div>
              
              <div className="p-2 space-y-2">
                <div>
                    <div className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wider">Args</div>
                    <code className="block font-mono text-neutral-400 break-all whitespace-pre-wrap bg-neutral-950/50 p-1.5 rounded border border-neutral-800/50">
                        {JSON.stringify(tool.args, null, 2)}
                    </code>
                </div>
                {tool.result != null && (
                    <div>
                        <div className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wider">Result</div>
                        <code className="block font-mono text-neutral-400 break-all whitespace-pre-wrap max-h-32 overflow-y-auto bg-neutral-950/50 p-1.5 rounded border border-neutral-800/50 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                            {formatToolResult(tool.result)}
                        </code>
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  onFork,
  onCopy,
  isLast = false,
}) => {
  const isUser = message.role === 'user';
  const parts = useMemo(() => parseMarkdown(message.content), [message.content]);
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
        className={cn(
            "group flex gap-4 w-full mx-auto p-4 transition-colors duration-200",
            "hover:bg-neutral-900/20" 
        )}
    >
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div 
                className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-inset",
                    isUser 
                        ? "bg-blue-600/10 text-blue-400 ring-blue-500/20" 
                        : "bg-emerald-600/10 text-emerald-400 ring-emerald-500/20"
                )}
            >
                {isUser ? (
                    <User className="w-5 h-5" />
                ) : (
                    <Sparkles className="w-5 h-5" />
                )}
            </div>
        </div>

        <div className="flex-grow min-w-0 space-y-2">
            <div className="flex items-center justify-between h-8">
                <span className="text-sm font-medium text-neutral-300">
                    {isUser ? 'You' : 'Cluso AI'}
                </span>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-neutral-500 hover:text-neutral-300"
                        onClick={handleCopyMessage}
                        title="Copy message"
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <MessageActions 
                        timestamp={message.timestamp}
                        onFork={onFork}
                        isDarkMode={true}
                    />
                </div>
            </div>

            <div className={cn(
                "text-[15px] leading-7 text-neutral-300",
                isStreaming && isLast && "animate-pulse-subtle"
            )}>
                {message.toolUsage && message.toolUsage.length > 0 && (
                    <ToolUsageBlock tools={message.toolUsage} />
                )}

                {parts.map((part, index) => {
                    if (part.type === 'code') {
                        return (
                            <div key={index} className="my-4 not-prose">
                                <CodeBlock 
                                    code={part.content} 
                                    language={part.language as any}
                                    isDarkMode={true}
                                    className="rounded-md border-neutral-800 shadow-sm"
                                />
                            </div>
                        );
                    }
                    
                    return (
                        <div key={index} className="text-neutral-200">
                            <FormattedText content={part.content} />
                        </div>
                    );
                })}

                {isStreaming && isLast && (
                    <span className="inline-block w-2 h-4 ml-1 align-middle bg-blue-400/50 animate-pulse rounded-sm" />
                )}
            </div>
        </div>
    </div>
  );
};

export default ChatMessage;
