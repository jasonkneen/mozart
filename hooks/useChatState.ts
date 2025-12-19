import { useState, useEffect, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolUse?: any;
}

export interface ContextItem {
  path: string;
  [key: string]: any;
}

export interface ChatTab {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  contexts: ContextItem[];
}

export interface ChatState {
  tabs: ChatTab[];
  activeTabId: string | null;
}

const STORAGE_KEY = 'cluso_chat_state';

export function useChatState() {
  const [state, setState] = useState<ChatState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load chat state from localStorage', e);
    }
    
    const initialTabId = crypto.randomUUID();
    return {
      tabs: [{
        id: initialTabId,
        name: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        contexts: []
      }],
      activeTabId: initialTabId
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save chat state to localStorage', e);
    }
  }, [state]);

  const createTab = useCallback(() => {
    const newTab: ChatTab = {
      id: crypto.randomUUID(),
      name: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      contexts: []
    };

    setState(prev => ({
      tabs: [...prev.tabs, newTab],
      activeTabId: newTab.id
    }));
    
    return newTab.id;
  }, []);

  const closeTab = useCallback((id: string) => {
    setState(prev => {
      const newTabs = prev.tabs.filter(t => t.id !== id);
      
      if (newTabs.length === 0) {
        const newTab: ChatTab = {
          id: crypto.randomUUID(),
          name: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          contexts: []
        };
        return {
          tabs: [newTab],
          activeTabId: newTab.id
        };
      }

      let newActiveId = prev.activeTabId;
      if (id === prev.activeTabId) {
        newActiveId = newTabs[newTabs.length - 1].id;
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId
      };
    });
  }, []);

  const switchTab = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      activeTabId: id
    }));
  }, []);

  const renameTab = useCallback((id: string, name: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.id === id ? { ...tab, name } : tab
      )
    }));
  }, []);

  const addMessage = useCallback((tabId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => {
        if (tab.id !== tabId) return tab;
        
        let name = tab.name;
        if (tab.messages.length === 0 && message.role === 'user') {
          name = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
        }

        return {
          ...tab,
          name,
          messages: [...tab.messages, newMessage]
        };
      })
    }));
  }, []);

  const clearMessages = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.id === tabId ? { ...tab, messages: [] } : tab
      )
    }));
  }, []);

  const addContext = useCallback((tabId: string, context: ContextItem) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => {
        if (tab.id !== tabId) return tab;
        const exists = tab.contexts.some(c => c.path === context.path);
        if (exists) return tab;
        
        return {
          ...tab,
          contexts: [...tab.contexts, context]
        };
      })
    }));
  }, []);

  const removeContext = useCallback((tabId: string, path: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.id === tabId ? { 
          ...tab, 
          contexts: tab.contexts.filter(c => c.path !== path) 
        } : tab
      )
    }));
  }, []);

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab: state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0],
    createTab,
    closeTab,
    switchTab,
    renameTab,
    addMessage,
    clearMessages,
    addContext,
    removeContext
  };
}
