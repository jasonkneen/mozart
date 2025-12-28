import React, { useState, useEffect } from 'react';
import {
  User, GitBranch, Box, Terminal, Cpu, Zap, ExternalLink,
  Palette, ChevronDown, MessageSquare, History, FileJson,
  Info, Key, LogOut, Check, Save, AlertCircle, Moon, Sun,
  Volume2, Bell, Eye, Code, Keyboard, Globe, Shield, Link, Unlink, Plus, X,
  Server, Plug, Trash2, RefreshCw
} from 'lucide-react';
import { oauthService } from '../services/oauthService';
import useMCP from '../hooks/useMCP';
import { useSettings, Settings } from '../hooks/useSettings';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; label?: string }> = ({ enabled, onChange, label }) => (
  <button
    onClick={() => onChange(!enabled)}
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    className={`w-11 h-6 rounded-full relative transition-colors ${
      enabled ? 'bg-blue-600' : 'bg-white/10'
    }`}
  >
    <div
      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
        enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
      }`}
    />
  </button>
);

type VerifyStatus = 'idle' | 'verifying' | 'success' | 'error';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const { settings, updateSettings } = useSettings();
  const [anthropicVerify, setAnthropicVerify] = useState<VerifyStatus>('idle');
  const [openaiVerify, setOpenaiVerify] = useState<VerifyStatus>('idle');
  const [claudeConnected, setClaudeConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [newServer, setNewServer] = useState({ name: '', command: '', args: '' });

  const { servers, connect, disconnect, addServer, removeServer, isConnecting } = useMCP({
    initialServers: settings.experimental.configuredServers || [],
    autoConnect: false
  });

  const handleAddServer = () => {
    if (!newServer.name || !newServer.command) return;
    const config = {
      id: newServer.name.toLowerCase().replace(/\s+/g, '-'),
      name: newServer.name,
      command: newServer.command,
      args: newServer.args.split(' ').filter(Boolean),
      enabled: true
    };
    addServer(config);
    const updatedServers = [...(settings.experimental.configuredServers || []), config];
    updateSettings('experimental', 'configuredServers', updatedServers);
    setNewServer({ name: '', command: '', args: '' });
  };

  const handleRemoveServer = async (id: string) => {
    await removeServer(id);
    const updatedServers = (settings.experimental.configuredServers || []).filter((s: any) => s.id !== id);
    updateSettings('experimental', 'configuredServers', updatedServers);
  };

  const handleConnectServer = async (id: string) => {
    const server = servers[id];
    if (server) {
      await connect(server.config);
    }
  };

  // Check Claude OAuth status
  useEffect(() => {
    oauthService.getStatus().then(status => {
      setClaudeConnected(status.isLoggedIn);
    }).catch(() => setClaudeConnected(false));
  }, []);

  const disconnectClaude = async () => {
    setDisconnecting('claude');
    try {
      await oauthService.logout();
      setClaudeConnected(false);
    } catch (e) {
      console.error('Failed to disconnect Claude:', e);
    }
    setDisconnecting(null);
  };

  const disconnectOpenAI = () => {
    setDisconnecting('openai');
    updateSettings('env', 'openaiApiKey', '');
    setTimeout(() => setDisconnecting(null), 500);
  };

  const disconnectAnthropic = () => {
    setDisconnecting('anthropic');
    updateSettings('env', 'anthropicApiKey', '');
    setTimeout(() => setDisconnecting(null), 500);
  };

  const addCustomVar = () => {
    const newVars = [...(settings.env.customVars || []), { name: '', value: '' }];
    updateSettings('env', 'customVars', newVars);
  };

  const updateCustomVar = (index: number, field: 'name' | 'value', val: string) => {
    const newVars = [...(settings.env.customVars || [])];
    newVars[index] = { ...newVars[index], [field]: val };
    updateSettings('env', 'customVars', newVars);
  };

  const removeCustomVar = (index: number) => {
    const newVars = (settings.env.customVars || []).filter((_, i) => i !== index);
    updateSettings('env', 'customVars', newVars);
  };

  const verifyAnthropicKey = async () => {
    if (!settings.env.anthropicApiKey) return;
    setAnthropicVerify('verifying');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.env.anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });
      setAnthropicVerify(res.ok ? 'success' : 'error');
    } catch {
      setAnthropicVerify('error');
    }
    setTimeout(() => setAnthropicVerify('idle'), 3000);
  };

  const verifyOpenAIKey = async () => {
    if (!settings.env.openaiApiKey) return;
    setOpenaiVerify('verifying');
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${settings.env.openaiApiKey}` }
      });
      setOpenaiVerify(res.ok ? 'success' : 'error');
    } catch {
      setOpenaiVerify('error');
    }
    setTimeout(() => setOpenaiVerify('idle'), 3000);
  };

  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen, {
    onEscape: onClose,
    returnFocus: true
  });

  if (!isOpen) return null;

  const sections = [
    {
      items: [
        { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
        { id: 'git', label: 'Git', icon: <GitBranch size={16} /> },
        { id: 'env', label: 'Environment', icon: <Box size={16} /> },
        { id: 'claude', label: 'Claude Code', icon: <Terminal size={16} /> },
        { id: 'account', label: 'Account', icon: <User size={16} /> },
      ]
    },
    {
      title: 'More',
      items: [
        { id: 'mcp', label: 'MCP Servers', icon: <Server size={16} /> },
        { id: 'experimental', label: 'Experimental', icon: <Zap size={16} /> },
        { id: 'keyboard', label: 'Keyboard Shortcuts', icon: <Keyboard size={16} /> },
        { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} />, external: true },
        { id: 'changelog', label: 'Changelog', icon: <FileJson size={16} />, external: true },
        { id: 'docs', label: 'Documentation', icon: <Info size={16} />, external: true },
      ]
    }
  ];

  return (
    <div 
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-[100] bg-[#0d0d0d] flex animate-in fade-in duration-200"
    >
      {/* Settings Nav */}
      <div className="w-[280px] h-full border-r border-white/5 flex flex-col p-6 pt-12 shrink-0">
        <h2 id="settings-modal-title" className="text-lg font-semibold text-white mb-6">Settings</h2>

        <div className="space-y-8 overflow-y-auto scrollbar-hide flex-1">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              {section.title && <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest ml-3">{section.title}</h3>}
              <div className="space-y-1">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => !item.external && setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === item.id ? 'bg-white/10 text-white shadow-lg' : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    {item.external && <ExternalLink size={14} className="opacity-40" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Back to App - at bottom */}
        <button
          onClick={onClose}
          aria-label="Close settings and return to app"
          className="flex items-center gap-2 text-base text-white/50 hover:text-white transition-all mt-6 group"
        >
          <ChevronDown size={18} className="rotate-90 group-hover:-translate-x-1 transition-transform" />
          Back to app
          <span className="text-xs bg-white/10 px-2 py-1 rounded ml-auto uppercase border border-white/10">Esc</span>
        </button>
      </div>

      {/* Settings Main Content */}
      <div className="flex-1 overflow-y-auto p-12 max-w-4xl scroll-smooth scrollbar-hide">
        {/* Chat Settings */}
        {activeTab === 'chat' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white mb-8">Chat</h1>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Default Model</h3>
                  <p className="text-sm text-white/50 mt-1">Model used for new conversations</p>
                </div>
                <select
                  value={settings.chat.defaultModel}
                  onChange={(e) => updateSettings('chat', 'defaultModel', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base text-white outline-none w-48"
                >
                  <option value="haiku">Claude Haiku</option>
                  <option value="sonnet">Claude Sonnet</option>
                  <option value="opus">Claude Opus</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Desktop Notifications</h3>
                  <p className="text-sm text-white/50 mt-1">Alert when agents finish their work</p>
                </div>
                <Toggle
                  enabled={settings.chat.desktopNotifications}
                  onChange={(v) => updateSettings('chat', 'desktopNotifications', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Sound Effects</h3>
                  <p className="text-sm text-white/50 mt-1">Play sounds for notifications</p>
                </div>
                <Toggle
                  enabled={settings.chat.soundEnabled}
                  onChange={(v) => updateSettings('chat', 'soundEnabled', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Show Thinking</h3>
                  <p className="text-sm text-white/50 mt-1">Display Claude's reasoning process</p>
                </div>
                <Toggle
                  enabled={settings.chat.showThinking}
                  onChange={(v) => updateSettings('chat', 'showThinking', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Stream Responses</h3>
                  <p className="text-sm text-white/50 mt-1">Show responses as they're generated</p>
                </div>
                <Toggle
                  enabled={settings.chat.streamResponses}
                  onChange={(v) => updateSettings('chat', 'streamResponses', v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Appearance Settings */}
        {activeTab === 'appearance' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Appearance</h1>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Theme</h3>
                  <p className="text-sm text-white/50 mt-1">Toggle with ⌘⇧T</p>
                </div>
                <select
                  value={settings.appearance.theme}
                  onChange={(e) => updateSettings('appearance', 'theme', e.target.value as 'dark' | 'light' | 'system')}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base text-white outline-none w-48"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light (Coming Soon)</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Mono Font</h3>
                  <p className="text-sm text-white/50 mt-1">Code and terminal</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={settings.appearance.monoFont}
                    onChange={(e) => updateSettings('appearance', 'monoFont', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-40"
                  >
                    <option value="Geist Mono">Geist Mono</option>
                    <option value="SF Mono">SF Mono</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                    <option value="Fira Code">Fira Code</option>
                    <option value="Monaco">Monaco</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="10"
                      max="20"
                      value={settings.appearance.monoFontSize}
                      onChange={(e) => updateSettings('appearance', 'monoFontSize', Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-white/60 w-10">{settings.appearance.monoFontSize}px</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Application Font</h3>
                  <p className="text-sm text-white/50 mt-1">UI and interface</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={settings.appearance.appFont}
                    onChange={(e) => updateSettings('appearance', 'appFont', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-40"
                  >
                    <option value="Inter">Inter</option>
                    <option value="SF Pro">SF Pro</option>
                    <option value="Helvetica Neue">Helvetica Neue</option>
                    <option value="system-ui">System</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="12"
                      max="18"
                      value={settings.appearance.appFontSize}
                      onChange={(e) => updateSettings('appearance', 'appFontSize', Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-white/60 w-10">{settings.appearance.appFontSize}px</span>
                  </div>
                </div>
              </div>

              <div className="py-4">
                <h3 className="text-base font-semibold text-white mb-4">Preview</h3>
                <div
                  className="bg-[#0D0D0D] border border-white/5 rounded-xl p-6 leading-relaxed text-white/60 shadow-inner"
                  style={{ fontFamily: settings.appearance.monoFont, fontSize: settings.appearance.monoFontSize }}
                >
                  <p className="text-white/20 mb-2">// Preview</p>
                  <p><span className="text-purple-400">const</span> greeting = <span className="text-green-400">'Hello, World!'</span>;</p>
                  <p><span className="text-purple-400">function</span> <span className="text-blue-400">sum</span>(a, b) {'{'} <span className="text-purple-400">return</span> a + b; {'}'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Git Settings */}
        {activeTab === 'git' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Git</h1>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Default Branch</h3>
                  <p className="text-sm text-white/50 mt-1">Branch used as base for new workspaces</p>
                </div>
                <input
                  type="text"
                  value={settings.git.defaultBranch}
                  onChange={(e) => updateSettings('git', 'defaultBranch', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base text-white outline-none w-48"
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Auto Stage Changes</h3>
                  <p className="text-sm text-white/50 mt-1">Automatically stage files after edits</p>
                </div>
                <Toggle
                  enabled={settings.git.autoStage}
                  onChange={(v) => updateSettings('git', 'autoStage', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Auto Commit</h3>
                  <p className="text-sm text-white/50 mt-1">Create commits after agent tasks</p>
                </div>
                <Toggle
                  enabled={settings.git.autoCommit}
                  onChange={(v) => updateSettings('git', 'autoCommit', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Sign Commits</h3>
                  <p className="text-sm text-white/50 mt-1">GPG sign all commits</p>
                </div>
                <Toggle
                  enabled={settings.git.signCommits}
                  onChange={(v) => updateSettings('git', 'signCommits', v)}
                />
              </div>

              {settings.git.signCommits && (
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">GPG Key ID</h3>
                    <p className="text-sm text-white/50 mt-1">Key used for signing</p>
                  </div>
                  <input
                    type="text"
                    value={settings.git.gpgKey}
                    onChange={(e) => updateSettings('git', 'gpgKey', e.target.value)}
                    placeholder="ABC123..."
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base text-white outline-none w-48 placeholder:text-white/20"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Environment Settings */}
        {activeTab === 'env' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Secrets & Environment</h1>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">API Keys</h3>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">Anthropic API Key {claudeConnected ? '' : '(optional)'}</label>
                  {claudeConnected ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-green-500/5 border border-green-500/20 rounded-lg text-sm text-green-400/70">
                      <Check size={14} />
                      Connected via OAuth
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={settings.env.anthropicApiKey}
                        onChange={(e) => updateSettings('env', 'anthropicApiKey', e.target.value)}
                        placeholder="sk-ant-..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base text-white font-mono outline-none placeholder:text-white/20"
                      />
                      <button
                        onClick={verifyAnthropicKey}
                        disabled={!settings.env.anthropicApiKey || anthropicVerify === 'verifying'}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          anthropicVerify === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          anthropicVerify === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {anthropicVerify === 'verifying' ? '...' :
                         anthropicVerify === 'success' ? <Check size={16} /> :
                         anthropicVerify === 'error' ? <AlertCircle size={16} /> : 'Verify'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">OpenAI API Key (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={settings.env.openaiApiKey}
                      onChange={(e) => updateSettings('env', 'openaiApiKey', e.target.value)}
                      placeholder="sk-..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base text-white font-mono outline-none placeholder:text-white/20"
                    />
                    <button
                      onClick={verifyOpenAIKey}
                      disabled={!settings.env.openaiApiKey || openaiVerify === 'verifying'}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        openaiVerify === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        openaiVerify === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {openaiVerify === 'verifying' ? '...' :
                       openaiVerify === 'success' ? <Check size={16} /> :
                       openaiVerify === 'error' ? <AlertCircle size={16} /> : 'Verify'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Environment Variables */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Custom Variables</h3>

                <div className="space-y-2">
                  {(settings.env.customVars || []).map((v, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => updateCustomVar(idx, 'name', e.target.value)}
                        placeholder="VARIABLE_NAME"
                        className="w-[180px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none placeholder:text-white/20 uppercase"
                      />
                      <input
                        type="password"
                        value={v.value}
                        onChange={(e) => updateCustomVar(idx, 'value', e.target.value)}
                        placeholder="value..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none placeholder:text-white/20"
                      />
                      <button
                        onClick={() => removeCustomVar(idx)}
                        className="px-2 py-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addCustomVar}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    Add Variable
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">AWS Bedrock</h3>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-base font-semibold text-white">Use AWS Bedrock</h3>
                    <p className="text-sm text-white/50 mt-1">Route requests through AWS</p>
                  </div>
                  <Toggle
                    enabled={settings.env.useBedrock}
                    onChange={(v) => updateSettings('env', 'useBedrock', v)}
                  />
                </div>

                {settings.env.useBedrock && (
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">AWS Region</label>
                    <select
                      value={settings.env.awsRegion}
                      onChange={(e) => updateSettings('env', 'awsRegion', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base text-white outline-none"
                    >
                      <option value="us-east-1">us-east-1</option>
                      <option value="us-west-2">us-west-2</option>
                      <option value="eu-west-1">eu-west-1</option>
                      <option value="ap-northeast-1">ap-northeast-1</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Claude Code Settings */}
        {activeTab === 'claude' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Claude Code</h1>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Max Tokens</h3>
                  <p className="text-sm text-white/50 mt-1">Maximum response length</p>
                </div>
                <select
                  value={settings.claude.maxTokens}
                  onChange={(e) => updateSettings('claude', 'maxTokens', Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base text-white outline-none w-48"
                >
                  <option value={4096}>4,096 tokens</option>
                  <option value={8192}>8,192 tokens</option>
                  <option value={16384}>16,384 tokens</option>
                  <option value={32768}>32,768 tokens</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Temperature</h3>
                  <p className="text-sm text-white/50 mt-1">Response creativity (0 = focused, 1 = creative)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.claude.temperature}
                    onChange={(e) => updateSettings('claude', 'temperature', Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-base text-white/60 w-12">{settings.claude.temperature}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Top P</h3>
                  <p className="text-sm text-white/50 mt-1">Nucleus sampling (0.1 = focused, 1 = diverse)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={settings.claude.topP ?? 1.0}
                    onChange={(e) => updateSettings('claude', 'topP', Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-base text-white/60 w-12">{settings.claude.topP ?? 1.0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Enable Tools</h3>
                  <p className="text-sm text-white/50 mt-1">Allow Claude to use Bash, Edit, Read tools</p>
                </div>
                <Toggle
                  enabled={settings.claude.toolsEnabled}
                  onChange={(v) => updateSettings('claude', 'toolsEnabled', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Permission Mode</h3>
                  <p className="text-sm text-white/50 mt-1">How to handle tool permissions</p>
                </div>
                <select
                  value={settings.claude.permissionMode}
                  onChange={(e) => updateSettings('claude', 'permissionMode', e.target.value as 'ask' | 'auto' | 'deny')}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base text-white outline-none w-48"
                >
                  <option value="ask">Ask before executing</option>
                  <option value="auto">Auto-approve</option>
                  <option value="deny">Deny all</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Account Settings */}
        {activeTab === 'account' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Connected Accounts</h1>

            <div className="space-y-3">
              {/* Claude OAuth */}
              <div className={`p-4 rounded-xl border transition-colors ${
                claudeConnected
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      claudeConnected ? 'bg-[#D97757]' : 'bg-white/10'
                    }`}>
                      <span className="text-white font-bold text-sm">C</span>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white">Claude</h3>
                      <p className="text-xs text-white/40">
                        {claudeConnected ? 'Connected via OAuth' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {claudeConnected ? (
                    <button
                      onClick={disconnectClaude}
                      disabled={disconnecting === 'claude'}
                      className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                    >
                      {disconnecting === 'claude' ? '...' : <><Unlink size={14} /> Disconnect</>}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-white/30">
                      <Link size={12} /> Login from main screen
                    </span>
                  )}
                </div>
              </div>

              {/* Anthropic API Key */}
              <div className={`p-4 rounded-xl border transition-colors ${
                settings.env.anthropicApiKey
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      settings.env.anthropicApiKey ? 'bg-[#D97757]' : 'bg-white/10'
                    }`}>
                      <span className="text-white font-bold text-sm">A</span>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white">Anthropic</h3>
                      <p className="text-xs text-white/40">
                        {settings.env.anthropicApiKey ? 'API Key configured' : 'Not configured'}
                      </p>
                    </div>
                  </div>
                  {settings.env.anthropicApiKey && (
                    <button
                      onClick={disconnectAnthropic}
                      disabled={disconnecting === 'anthropic'}
                      className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                    >
                      {disconnecting === 'anthropic' ? '...' : <><Unlink size={14} /> Remove</>}
                    </button>
                  )}
                </div>
              </div>

              {/* OpenAI API Key */}
              <div className={`p-4 rounded-xl border transition-colors ${
                settings.env.openaiApiKey
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      settings.env.openaiApiKey ? 'bg-[#10A37F]' : 'bg-white/10'
                    }`}>
                      <span className="text-white font-bold text-sm">O</span>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white">OpenAI</h3>
                      <p className="text-xs text-white/40">
                        {settings.env.openaiApiKey ? 'API Key configured' : 'Not configured'}
                      </p>
                    </div>
                  </div>
                  {settings.env.openaiApiKey && (
                    <button
                      onClick={disconnectOpenAI}
                      disabled={disconnecting === 'openai'}
                      className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                    >
                      {disconnecting === 'openai' ? '...' : <><Unlink size={14} /> Remove</>}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-white/30 pt-2">
              API keys can be configured in the Environment section. OAuth connections are managed through the login flow.
            </p>
          </div>
        )}

        {/* MCP Servers */}
        {activeTab === 'mcp' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">MCP Servers</h1>
              <button
                onClick={() => {
                  // Refresh logic if needed
                }}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Add Server Form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                <h3 className="text-base font-semibold text-white">Add Server</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-wider">Name</label>
                    <input
                      type="text"
                      value={newServer.name}
                      onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                      placeholder="e.g. Postgres"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-wider">Command</label>
                    <input
                      type="text"
                      value={newServer.command}
                      onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                      placeholder="e.g. npx"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Arguments</label>
                  <input
                    type="text"
                    value={newServer.args}
                    onChange={(e) => setNewServer({ ...newServer, args: e.target.value })}
                    placeholder="e.g. -y @modelcontextprotocol/server-postgres postgresql://localhost/db"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 font-mono"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddServer}
                    disabled={!newServer.name || !newServer.command}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                    Add Server
                  </button>
                </div>
              </div>

              {/* Server List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Configured Servers</h3>
                {Object.values(servers).length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                    No servers configured
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.values(servers).map((server) => (
                      <div key={server.config.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              server.status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                              server.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                              server.status === 'error' ? 'bg-red-500' :
                              'bg-white/20'
                            }`} />
                            <div>
                              <h4 className="text-base font-medium text-white">{server.config.name}</h4>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <code className="bg-black/20 px-1.5 py-0.5 rounded">{server.config.command}</code>
                                <span>{server.status}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {server.status === 'connected' ? (
                              <button
                                onClick={() => disconnect(server.config.id)}
                                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Disconnect"
                              >
                                <Unlink size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnectServer(server.config.id)}
                                disabled={server.status === 'connecting'}
                                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Connect"
                              >
                                <Plug size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveServer(server.config.id)}
                              className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {server.error && (
                          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 font-mono break-all">
                            {server.error}
                          </div>
                        )}

                        {server.status === 'connected' && (
                          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Tools</div>
                              <div className="text-lg font-mono text-white/80">{server.tools.length}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Resources</div>
                              <div className="text-lg font-mono text-white/80">{server.resources.length}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Prompts</div>
                              <div className="text-lg font-mono text-white/80">{server.prompts.length}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Experimental Settings */}
        {activeTab === 'experimental' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Experimental</h1>
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded">Beta</span>
            </div>
            <p className="text-base text-white/50">These features are experimental and may change or be removed.</p>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Agent Mode</h3>
                  <p className="text-sm text-white/50 mt-1">Enable autonomous multi-turn agent</p>
                </div>
                <Toggle
                  enabled={settings.experimental.enableAgentMode}
                  onChange={(v) => updateSettings('experimental', 'enableAgentMode', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Parallel Tool Execution</h3>
                  <p className="text-sm text-white/50 mt-1">Run multiple tools simultaneously</p>
                </div>
                <Toggle
                  enabled={settings.experimental.parallelTools}
                  onChange={(v) => updateSettings('experimental', 'parallelTools', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">Ultra Thinking</h3>
                  <p className="text-sm text-white/50 mt-1">Extended reasoning with 128k budget</p>
                </div>
                <Toggle
                  enabled={settings.experimental.ultraThinking}
                  onChange={(v) => updateSettings('experimental', 'ultraThinking', v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts */}
        {activeTab === 'keyboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Keyboard Shortcuts</h1>
            <div className="space-y-4">
              {[
                { keys: '⌘ K', action: 'Open command palette' },
                { keys: '⌘ N', action: 'New workspace' },
                { keys: '⌘ ⇧ P', action: 'Create pull request' },
                { keys: '⌘ Enter', action: 'Send message' },
                { keys: '⌘ /', action: 'Toggle sidebar' },
                { keys: '⌘ B', action: 'Toggle version control' },
                { keys: '⌘ `', action: 'Toggle terminal' },
                { keys: '⌘ ,', action: 'Open settings' },
                { keys: 'Escape', action: 'Close modal / Cancel' },
                { keys: '⌘ ⇧ T', action: 'Toggle theme' },
              ].map((shortcut, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-base text-white/60">{shortcut.action}</span>
                  <kbd className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white/80 font-mono">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
