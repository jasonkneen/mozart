
import React, { useState } from 'react';
import { 
  User, GitBranch, Box, Terminal, Cpu, Zap, ExternalLink, 
  Palette, ChevronDown, MessageSquare, History, FileJson, 
  Info, Key, LogOut, Check
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('chat');
  
  if (!isOpen) return null;

  const sections = [
    {
      items: [
        { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
        { id: 'git', label: 'Git', icon: <GitBranch size={16} /> },
        { id: 'env', label: 'Env', icon: <Box size={16} /> },
        { id: 'claude', label: 'Claude Code', icon: <Terminal size={16} /> },
        { id: 'account', label: 'Account', icon: <User size={16} /> },
      ]
    },
    {
      title: 'More',
      items: [
        { id: 'experimental', label: 'Experimental', icon: <Zap size={16} /> },
        { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} /> },
        { id: 'updates', label: 'Check for updates', icon: <History size={16} /> },
        { id: 'changelog', label: 'Changelog', icon: <FileJson size={16} />, external: true },
        { id: 'docs', label: 'Docs', icon: <Info size={16} />, external: true },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex animate-in fade-in duration-200">
      {/* Settings Nav */}
      <div className="w-[280px] h-full border-r border-white/5 flex flex-col p-6 shrink-0">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-all mb-12 group"
        >
          <ChevronDown size={18} className="rotate-90 group-hover:-translate-x-1 transition-transform" />
          Back to app <span className="text-[10px] bg-white/5 px-1 rounded ml-1 uppercase border border-white/5">Esc</span>
        </button>

        <div className="space-y-8 overflow-y-auto scrollbar-hide">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              {section.title && <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-3">{section.title}</h3>}
              <div className="space-y-1">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => !item.external && setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      activeTab === item.id ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    {item.external && <ExternalLink size={12} className="opacity-40" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Main Content */}
      <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto scroll-smooth scrollbar-hide">
        {activeTab === 'chat' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white mb-8">Chat</h1>
            <div className="space-y-8 divide-y divide-white/5">
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Default Model</h3>
                  <p className="text-xs text-white/40">Default agent for new workspaces</p>
                </div>
                <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48">
                  <option>Opus 4.5</option>
                  <option>Sonnet 4.5</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-6">
                <div>
                  <h3 className="text-sm font-semibold text-white">Desktop notifications</h3>
                  <p className="text-xs text-white/40">Alert when agents finish their work</p>
                </div>
                <div className="w-10 h-6 bg-white/10 rounded-full relative p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Appearance</h1>
            <div className="space-y-8 divide-y divide-white/5">
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Theme</h3>
                  <p className="text-xs text-white/40">Toggle with ⌘⇧T</p>
                </div>
                <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48">
                  <option>Obsidian Glass</option>
                  <option>Light (Coming Soon)</option>
                </select>
              </div>

              <div className="py-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Mono Font</h3>
                    <p className="text-xs text-white/40">Used for code and terminal</p>
                  </div>
                  <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48">
                    <option>Geist Mono</option>
                    <option>iA Writer Mono</option>
                  </select>
                </div>
                <div className="bg-[#0D0D0D] border border-white/5 rounded-xl p-6 font-mono text-sm leading-relaxed text-white/60 shadow-inner">
                  <p className="text-white/20 mb-2">// Preview</p>
                  <p><span className="text-purple-400">const</span> greeting = <span className="text-green-400">'Hello, World!'</span>;</p>
                  <p><span className="text-purple-400">function</span> <span className="text-blue-400">sum</span>(a, b) &#123; <span className="text-purple-400">return</span> a + b; &#125;</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'env' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Environment Variables</h1>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">Claude Code</h3>
                <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-6 font-mono text-sm relative group">
                  <div className="space-y-1 text-white/40">
                    <p>ANTHROPIC_API_KEY=sk-ant-...</p>
                    <p>CLAUDE_CODE_USE_BEDROCK=1</p>
                    <p>AWS_REGION=us-east-1</p>
                  </div>
                  <button className="absolute bottom-4 right-4 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-bold text-white transition-all">Save</button>
                </div>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3 text-xs text-white/60">
                 <Check size={16} className="text-green-500" />
                 Authenticated via local gh CLI
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
