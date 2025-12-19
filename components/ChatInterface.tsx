
import React, { useState, useRef, useEffect } from 'react';
import { Message, ThinkingLevel } from '../types';
import { 
  Send, Paperclip, ChevronRight, Sparkles, Command, Cpu, 
  ChevronDown, Check, Undo2, Copy, FileText, Terminal, 
  Globe, Boxes, Box, CheckCircle2, ExternalLink, 
  ListRestart, Edit3, Brain, ArrowDown
} from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string, level: ThinkingLevel) => void;
  isLoading: boolean;
}

const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Opus 4.5');

  const models = [
    { group: 'Claude Code', items: ['Opus 4.5', 'Sonnet 4.5', 'Haiku 4.5'] },
    { group: 'Codex', items: ['GPT-5-Codex', 'GPT-5-Codex-Mini'] },
  ];

  return (
    <div className="relative">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs text-white/60"
      >
        <Sparkles size={14} className="text-yellow-400" />
        {selectedModel}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2">
          {models.map((group, idx) => (
            <div key={group.group} className={idx > 0 ? 'border-t border-white/5' : ''}>
              <div className="px-4 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">{group.group}</div>
              {group.items.map(item => (
                <button
                  key={item}
                  onClick={() => {
                    setSelectedModel(item);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-white/10 rounded-full flex items-center justify-center">
                      <div className="w-[1px] h-3 bg-white/20 rotate-45 absolute" />
                      <div className="w-3 h-[1px] bg-white/20 rotate-45 absolute" />
                    </div>
                    {item}
                  </div>
                  {selectedModel === item && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState<ThinkingLevel>(ThinkingLevel.None);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input, level);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0A] relative">
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-12 space-y-12 max-w-4xl mx-auto w-full scroll-smooth scrollbar-hide"
      >
        {/* Compacted History indicator */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-lg group cursor-pointer hover:bg-white/10 transition-all text-white/40">
          <ListRestart size={14} />
          <span className="text-xs font-mono font-medium">Chat history compacted</span>
          <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100">
             <Copy size={12} />
             <ChevronRight size={14} />
          </div>
        </div>

        {messages.map((m) => (
          <div key={m.id} className="space-y-6 group relative">
            {m.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-[#1C1C1E] px-5 py-2.5 rounded-2xl text-[14px] font-medium text-white/90 shadow-xl max-w-[85%] leading-relaxed border border-white/5">
                  {m.content}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* Granular Traces */}
                {m.traces?.map((trace, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {trace.type === 'Thinking' && (
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Brain size={14} className="opacity-40" />
                        <span className="font-medium">Thinking</span>
                        <div className="bg-white/5 px-2 py-1 rounded text-[11px] font-mono text-white/30 border border-white/5">
                          {trace.content}
                        </div>
                      </div>
                    )}
                    {trace.type === 'Lint' && (
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Terminal size={14} className="opacity-40" />
                        <span className="font-medium">Linting</span>
                        <div className="bg-white/5 px-2 py-1 rounded text-[11px] font-mono text-white/30 border border-white/5">
                          {trace.command}
                        </div>
                      </div>
                    )}
                    {trace.type === 'Edit' && (
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Edit3 size={14} className="opacity-40 text-blue-400" />
                        <span className="font-medium">Edit</span>
                        <div className="bg-white/5 px-2 py-1 rounded text-[11px] font-mono text-blue-400/80 border border-white/5">
                          {trace.content}
                        </div>
                        {trace.diff && (
                           <div className="flex items-center gap-1.5 ml-1">
                              <span className="text-[10px] font-bold text-green-500">+{trace.diff.added}</span>
                              <span className="text-[10px] font-bold text-red-500">-{trace.diff.removed}</span>
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div className="prose prose-invert prose-sm max-w-none text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap font-normal">
                  {m.content}
                </div>

                {/* Plan Section */}
                {m.plan && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold text-white">Summary</h2>
                    <div className="text-[15px] text-white/80 leading-relaxed max-w-3xl">
                      {m.plan.description}
                    </div>
                    <div className="space-y-6">
                      {m.plan.steps.map((step, idx) => (
                         <div key={idx} className="space-y-1">
                           <div className="flex items-center gap-2 font-bold text-white">
                             {idx + 1}. {step.label} {step.completed && <Check size={14} className="text-green-500" />}
                           </div>
                           <p className="text-sm text-white/50 ml-4">{step.details}</p>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="w-8 h-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center shrink-0">
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
             </div>
             <span className="text-xs font-bold text-white/20 uppercase tracking-widest">Conductor is executing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollBottom && (
        <button 
          onClick={scrollToBottom}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/10 rounded-full text-[11px] font-bold text-white/60 hover:text-white transition-all shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2"
        >
          <ArrowDown size={14} /> Scroll to bottom
        </button>
      )}

      {/* Input Area */}
      <div className="p-12 pt-0 max-w-4xl mx-auto w-full">
        <div className="relative">
          <form 
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 p-2 shadow-2xl transition-all focus-within:border-white/20 bg-white/[0.03] backdrop-blur-xl"
          >
            <div className="flex items-center px-4 pt-2">
               <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask to make changes, @mention files, run /commands"
                className="w-full bg-transparent border-none outline-none resize-none text-[15px] text-white placeholder:text-white/20 min-h-[44px] max-h-[200px]"
                rows={1}
              />
              <span className="text-[10px] text-white/20 font-mono self-start mt-1 shrink-0 uppercase tracking-tighter">⌘L to focus</span>
            </div>
            
            <div className="flex items-center justify-between px-2 py-1 mt-2">
              <div className="flex items-center gap-2">
                <ModelSelector />
                <button type="button" className="p-2 text-white/20 hover:text-white transition-colors" title="MCP Context"><Boxes size={18} /></button>
                <button type="button" className="p-2 text-white/20 hover:text-white transition-colors" title="Automations"><Sparkles size={18} /></button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="p-2 text-white/20 hover:text-white transition-colors">
                  <Paperclip size={18} />
                </button>
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white rounded-xl transition-all shadow-xl active:scale-90"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
