import { useState, useEffect, useCallback } from 'react';

/** MCP Server configuration */
export interface McpServerConfig {
  name: string;
  url: string;
  enabled: boolean;
  apiKey?: string;
}

export interface Settings {
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
    monoFontSize: number;
    appFont: string;
    appFontSize: number;
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
    customVars: Array<{ name: string; value: string }>;
  };
  claude: {
    maxTokens: number;
    temperature: number;
    topP: number;
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
    configuredServers: McpServerConfig[];
  };
}

export const defaultSettings: Settings = {
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
    monoFontSize: 13,
    appFont: 'Inter',
    appFontSize: 14,
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
    customVars: [],
  },
  claude: {
    maxTokens: 8192,
    temperature: 0.7,
    topP: 1.0,
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
    configuredServers: [],
  },
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mozart-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new fields
        setSettings({
          ...defaultSettings,
          ...parsed,
          claude: {
            ...defaultSettings.claude,
            ...parsed.claude
          }
        });
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
    setLoaded(true);
  }, []);

  const updateSettings = useCallback(<K extends keyof Settings>(
    category: K,
    key: keyof Settings[K],
    value: Settings[K][keyof Settings[K]]
  ) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value
        }
      };
      localStorage.setItem('mozart-settings', JSON.stringify(newSettings));
      // Dispatch custom event so App.tsx can react without polling
      window.dispatchEvent(new CustomEvent('mozart-settings-changed'));
      return newSettings;
    });
  }, []);

  return { settings, updateSettings, loaded };
}
