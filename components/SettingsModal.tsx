
import React, { useState, useEffect } from 'react';
import {
  User, GitBranch, Box, Terminal, Cpu, Zap, ExternalLink,
  Palette, ChevronDown, MessageSquare, History, FileJson,
  Info, Key, LogOut, Check, Save, AlertCircle, Moon, Sun,
  Volume2, Bell, Eye, Code, Keyboard, Globe, Shield
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Settings state type
interface Settings {
  chat: {
    defaultModel: string;
    desktopNotifications: boolean;
    soundEnabled: boolean;
    showThinking: boolean;
    streamResponses: boolean;
  };
  appearance: {
    theme: 'dark' | 'light' | 'system';
    monoFont: string;
    fontSize: number;
    lineHeight: number;
    accentColor: string;
  };
  git: {
    autoStage: boolean;
    autoCommit: boolean;
    defaultBranch: string;
    signCommits: boolean;
    gpgKey: string;
  };
  env: {
    anthropicApiKey: string;
    useBedrock: boolean;
    awsRegion: string;
    openaiApiKey: string;
  };
  claude: {
    maxTokens: number;
    temperature: number;
    toolsEnabled: boolean;
    permissionMode: 'ask' | 'auto' | 'deny';
  };
  account: {
    email: string;
    plan: string;
    usage: number;
    limit: number;
  };
  experimental: {
    enableAgentMode: boolean;
    parallelTools: boolean;
    ultraThinking: boolean;
    mcpServers: boolean;
  };
}

const defaultSettings: Settings = {
  chat: {
    defaultModel: 'sonnet',
    desktopNotifications: true,
    soundEnabled: false,
    showThinking: true,
    streamResponses: true,
  },
  appearance: {
    theme: 'dark',
    monoFont: 'Geist Mono',
    fontSize: 13,
    lineHeight: 1.5,
    accentColor: '#3B82F6',
  },
  git: {
    autoStage: true,
    autoCommit: false,
    defaultBranch: 'main',
    signCommits: false,
    gpgKey: '',
  },
  env: {
    anthropicApiKey: '',
    useBedrock: false,
    awsRegion: 'us-east-1',
    openaiApiKey: '',
  },
  claude: {
    maxTokens: 8192,
    temperature: 0.7,
    toolsEnabled: true,
    permissionMode: 'ask',
  },
  account: {
    email: '',
    plan: 'Pro',
    usage: 0,
    limit: 100000,
  },
  experimental: {
    enableAgentMode: true,
    parallelTools: true,
    ultraThinking: false,
    mcpServers: true,
  },
};

const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void }> = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
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

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mozart-settings');
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        // Use defaults
      }
    }
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const updateSettings = <K extends keyof Settings>(
    category: K,
    key: keyof Settings[K],
    value: Settings[K][keyof Settings[K]]
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('mozart-settings', JSON.stringify(settings));
      setSaveStatus('saved');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

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
        { id: 'experimental', label: 'Experimental', icon: <Zap size={16} /> },
        { id: 'keyboard', label: 'Keyboard Shortcuts', icon: <Keyboard size={16} /> },
        { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} />, external: true },
        { id: 'changelog', label: 'Changelog', icon: <FileJson size={16} />, external: true },
        { id: 'docs', label: 'Documentation', icon: <Info size={16} />, external: true },
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
          Back to app <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded ml-1 uppercase border border-white/5">Esc</span>
        </button>

        <div className="space-y-8 overflow-y-auto scrollbar-hide flex-1">
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

        {/* Save Button */}
        {hasChanges && (
          <button
            onClick={saveSettings}
            disabled={saveStatus === 'saving'}
            className="mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <>Saving...</>
            ) : saveStatus === 'saved' ? (
              <><Check size={16} /> Saved</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        )}
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
                  <h3 className="text-sm font-semibold text-white">Default Model</h3>
                  <p className="text-xs text-white/40 mt-1">Model used for new conversations</p>
                </div>
                <select
                  value={settings.chat.defaultModel}
                  onChange={(e) => updateSettings('chat', 'defaultModel', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48"
                >
                  <option value="haiku">Claude Haiku</option>
                  <option value="sonnet">Claude Sonnet</option>
                  <option value="opus">Claude Opus</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Desktop Notifications</h3>
                  <p className="text-xs text-white/40 mt-1">Alert when agents finish their work</p>
                </div>
                <Toggle
                  enabled={settings.chat.desktopNotifications}
                  onChange={(v) => updateSettings('chat', 'desktopNotifications', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Sound Effects</h3>
                  <p className="text-xs text-white/40 mt-1">Play sounds for notifications</p>
                </div>
                <Toggle
                  enabled={settings.chat.soundEnabled}
                  onChange={(v) => updateSettings('chat', 'soundEnabled', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Show Thinking</h3>
                  <p className="text-xs text-white/40 mt-1">Display Claude's reasoning process</p>
                </div>
                <Toggle
                  enabled={settings.chat.showThinking}
                  onChange={(v) => updateSettings('chat', 'showThinking', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Stream Responses</h3>
                  <p className="text-xs text-white/40 mt-1">Show responses as they're generated</p>
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
                  <h3 className="text-sm font-semibold text-white">Theme</h3>
                  <p className="text-xs text-white/40 mt-1">Toggle with ⌘⇧T</p>
                </div>
                <select
                  value={settings.appearance.theme}
                  onChange={(e) => updateSettings('appearance', 'theme', e.target.value as 'dark' | 'light' | 'system')}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light (Coming Soon)</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Mono Font</h3>
                  <p className="text-xs text-white/40 mt-1">Used for code and terminal</p>
                </div>
                <select
                  value={settings.appearance.monoFont}
                  onChange={(e) => updateSettings('appearance', 'monoFont', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48"
                >
                  <option value="Geist Mono">Geist Mono</option>
                  <option value="SF Mono">SF Mono</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Fira Code">Fira Code</option>
                  <option value="Monaco">Monaco</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Font Size</h3>
                  <p className="text-xs text-white/40 mt-1">Editor and terminal font size</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="20"
                    value={settings.appearance.fontSize}
                    onChange={(e) => updateSettings('appearance', 'fontSize', Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm text-white/60 w-8">{settings.appearance.fontSize}px</span>
                </div>
              </div>

              <div className="py-4">
                <h3 className="text-sm font-semibold text-white mb-4">Preview</h3>
                <div
                  className="bg-[#0D0D0D] border border-white/5 rounded-xl p-6 leading-relaxed text-white/60 shadow-inner"
                  style={{ fontFamily: settings.appearance.monoFont, fontSize: settings.appearance.fontSize }}
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
                  <h3 className="text-sm font-semibold text-white">Default Branch</h3>
                  <p className="text-xs text-white/40 mt-1">Branch used as base for new workspaces</p>
                </div>
                <input
                  type="text"
                  value={settings.git.defaultBranch}
                  onChange={(e) => updateSettings('git', 'defaultBranch', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48"
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Auto Stage Changes</h3>
                  <p className="text-xs text-white/40 mt-1">Automatically stage files after edits</p>
                </div>
                <Toggle
                  enabled={settings.git.autoStage}
                  onChange={(v) => updateSettings('git', 'autoStage', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Auto Commit</h3>
                  <p className="text-xs text-white/40 mt-1">Create commits after agent tasks</p>
                </div>
                <Toggle
                  enabled={settings.git.autoCommit}
                  onChange={(v) => updateSettings('git', 'autoCommit', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Sign Commits</h3>
                  <p className="text-xs text-white/40 mt-1">GPG sign all commits</p>
                </div>
                <Toggle
                  enabled={settings.git.signCommits}
                  onChange={(v) => updateSettings('git', 'signCommits', v)}
                />
              </div>

              {settings.git.signCommits && (
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">GPG Key ID</h3>
                    <p className="text-xs text-white/40 mt-1">Key used for signing</p>
                  </div>
                  <input
                    type="text"
                    value={settings.git.gpgKey}
                    onChange={(e) => updateSettings('git', 'gpgKey', e.target.value)}
                    placeholder="ABC123..."
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48 placeholder:text-white/20"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Environment Settings */}
        {activeTab === 'env' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h1 className="text-2xl font-bold text-white">Environment Variables</h1>
            <div className="space-y-6">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-xs text-green-400">
                <Check size={16} />
                Connected via Anthropic OAuth
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">API Keys</h3>

                <div className="space-y-2">
                  <label className="text-xs text-white/60">Anthropic API Key (optional)</label>
                  <input
                    type="password"
                    value={settings.env.anthropicApiKey}
                    onChange={(e) => updateSettings('env', 'anthropicApiKey', e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none placeholder:text-white/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/60">OpenAI API Key (optional)</label>
                  <input
                    type="password"
                    value={settings.env.openaiApiKey}
                    onChange={(e) => updateSettings('env', 'openaiApiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">AWS Bedrock</h3>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Use AWS Bedrock</h3>
                    <p className="text-xs text-white/40 mt-1">Route requests through AWS</p>
                  </div>
                  <Toggle
                    enabled={settings.env.useBedrock}
                    onChange={(v) => updateSettings('env', 'useBedrock', v)}
                  />
                </div>

                {settings.env.useBedrock && (
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">AWS Region</label>
                    <select
                      value={settings.env.awsRegion}
                      onChange={(e) => updateSettings('env', 'awsRegion', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
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
                  <h3 className="text-sm font-semibold text-white">Max Tokens</h3>
                  <p className="text-xs text-white/40 mt-1">Maximum response length</p>
                </div>
                <select
                  value={settings.claude.maxTokens}
                  onChange={(e) => updateSettings('claude', 'maxTokens', Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48"
                >
                  <option value={4096}>4,096 tokens</option>
                  <option value={8192}>8,192 tokens</option>
                  <option value={16384}>16,384 tokens</option>
                  <option value={32768}>32,768 tokens</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Temperature</h3>
                  <p className="text-xs text-white/40 mt-1">Response creativity (0 = focused, 1 = creative)</p>
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
                  <span className="text-sm text-white/60 w-8">{settings.claude.temperature}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Enable Tools</h3>
                  <p className="text-xs text-white/40 mt-1">Allow Claude to use Bash, Edit, Read tools</p>
                </div>
                <Toggle
                  enabled={settings.claude.toolsEnabled}
                  onChange={(v) => updateSettings('claude', 'toolsEnabled', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Permission Mode</h3>
                  <p className="text-xs text-white/40 mt-1">How to handle tool permissions</p>
                </div>
                <select
                  value={settings.claude.permissionMode}
                  onChange={(e) => updateSettings('claude', 'permissionMode', e.target.value as 'ask' | 'auto' | 'deny')}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none w-48"
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
            <h1 className="text-2xl font-bold text-white">Account</h1>
            <div className="space-y-6">
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
                    M
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Mozart User</h3>
                    <p className="text-sm text-white/40">Connected via OAuth</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">
                      Pro Plan
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Usage</h3>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">API Calls This Month</span>
                    <span className="text-sm text-white font-medium">12,345 / 100,000</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '12.3%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Experimental Settings */}
        {activeTab === 'experimental' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Experimental</h1>
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded">Beta</span>
            </div>
            <p className="text-sm text-white/40">These features are experimental and may change or be removed.</p>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Agent Mode</h3>
                  <p className="text-xs text-white/40 mt-1">Enable autonomous multi-turn agent</p>
                </div>
                <Toggle
                  enabled={settings.experimental.enableAgentMode}
                  onChange={(v) => updateSettings('experimental', 'enableAgentMode', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Parallel Tool Execution</h3>
                  <p className="text-xs text-white/40 mt-1">Run multiple tools simultaneously</p>
                </div>
                <Toggle
                  enabled={settings.experimental.parallelTools}
                  onChange={(v) => updateSettings('experimental', 'parallelTools', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Ultra Thinking</h3>
                  <p className="text-xs text-white/40 mt-1">Extended reasoning with 128k budget</p>
                </div>
                <Toggle
                  enabled={settings.experimental.ultraThinking}
                  onChange={(v) => updateSettings('experimental', 'ultraThinking', v)}
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">MCP Servers</h3>
                  <p className="text-xs text-white/40 mt-1">Enable Model Context Protocol servers</p>
                </div>
                <Toggle
                  enabled={settings.experimental.mcpServers}
                  onChange={(v) => updateSettings('experimental', 'mcpServers', v)}
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
                  <span className="text-sm text-white/60">{shortcut.action}</span>
                  <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/80 font-mono">
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
