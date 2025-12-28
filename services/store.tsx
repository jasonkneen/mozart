import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { FileDiff, FileNode, Message, Tab, Workspace } from '../types';

type StoreState = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  tabs: Tab[];
  activeTabId: string;
  messagesByTab: Record<string, Message[]>;
  diffsByWorkspace: Record<string, FileDiff[]>;
  fileTreeByWorkspace: Record<string, FileNode[]>;
  diffsLoadingByWorkspace: Record<string, boolean>;
  configsByWorkspace: Record<string, any>;
};

type StoreActions = {
  setActiveWorkspace: (id: string | null) => void;
  setTabs: (tabs: Tab[]) => void;
  setActiveTab: (id: string) => void;
  addTab: (tab: Tab) => void;
  removeTab: (tabId: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  addWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addTabMessage: (tabId: string, message: Message) => void;
  clearTabMessages: (tabId: string) => void;
  setWorkspaceDiffs: (workspaceId: string, diffs: FileDiff[]) => void;
  setWorkspaceFileTree: (workspaceId: string, fileTree: FileNode[]) => void;
  setWorkspaceDiffsLoading: (workspaceId: string, isLoading: boolean) => void;
  updateWorkspaceNotes: (workspaceId: string, notes: string) => void;
  setWorkspaceConfig: (workspaceId: string, config: any) => void;
};

type StoreContextValue = {
  state: StoreState;
  actions: StoreActions;
};

type StoreAction =
  | { type: 'set-active-workspace'; id: string | null }
  | { type: 'set-tabs'; tabs: Tab[] }
  | { type: 'set-active-tab'; id: string }
  | { type: 'add-tab'; tab: Tab }
  | { type: 'remove-tab'; tabId: string }
  | { type: 'set-tab-dirty'; tabId: string; isDirty: boolean }
  | { type: 'update-tab'; tabId: string; updates: Partial<Tab> }
  | { type: 'add-workspace'; workspace: Workspace }
  | { type: 'set-workspaces'; workspaces: Workspace[] }
  | { type: 'add-tab-message'; tabId: string; message: Message }
  | { type: 'clear-tab-messages'; tabId: string }
  | { type: 'set-workspace-diffs'; workspaceId: string; diffs: FileDiff[] }
  | { type: 'set-workspace-file-tree'; workspaceId: string; fileTree: FileNode[] }
  | { type: 'set-workspace-diffs-loading'; workspaceId: string; isLoading: boolean }
  | { type: 'update-workspace-notes'; workspaceId: string; notes: string }
  | { type: 'set-workspace-config'; workspaceId: string; config: any };

const STORAGE_KEY = 'conductor.store.v2';

const createInitialState = (): StoreState => {
  return {
    workspaces: [],
    activeWorkspaceId: null,
    tabs: [{ id: 't1', title: 'Claude', type: 'chat', active: true }],
    activeTabId: 't1',
    messagesByTab: {},
    diffsByWorkspace: {},
    fileTreeByWorkspace: {},
    diffsLoadingByWorkspace: {},
    configsByWorkspace: {}
  };
};

const defaultState = createInitialState();

const mergeState = (loaded: Partial<StoreState> | null): StoreState => {
  if (!loaded) return defaultState;

  const workspaces = Array.isArray(loaded.workspaces) && loaded.workspaces.length
    ? loaded.workspaces
    : defaultState.workspaces;

  const tabs = Array.isArray(loaded.tabs) && loaded.tabs.length ? loaded.tabs : defaultState.tabs;
  const diffsByWorkspace = loaded.diffsByWorkspace && typeof loaded.diffsByWorkspace === 'object'
    ? loaded.diffsByWorkspace
    : defaultState.diffsByWorkspace;
  const fileTreeByWorkspace = loaded.fileTreeByWorkspace && typeof loaded.fileTreeByWorkspace === 'object'
    ? loaded.fileTreeByWorkspace
    : defaultState.fileTreeByWorkspace;
  const diffsLoadingByWorkspace =
    loaded.diffsLoadingByWorkspace && typeof loaded.diffsLoadingByWorkspace === 'object'
      ? loaded.diffsLoadingByWorkspace
      : defaultState.diffsLoadingByWorkspace;

  const configsByWorkspace = loaded.configsByWorkspace && typeof loaded.configsByWorkspace === 'object'
    ? loaded.configsByWorkspace
    : defaultState.configsByWorkspace;

  const resolvedActiveWorkspaceId =
    loaded.activeWorkspaceId && workspaces.some((ws) => ws.id === loaded.activeWorkspaceId)
      ? loaded.activeWorkspaceId
      : workspaces[0]?.id ?? null;

  const resolvedActiveTabId =
    loaded.activeTabId && tabs.some((tab) => tab.id === loaded.activeTabId)
      ? loaded.activeTabId
      : tabs[0]?.id ?? '';

  const messagesByTab = loaded.messagesByTab && typeof loaded.messagesByTab === 'object'
    ? loaded.messagesByTab
    : defaultState.messagesByTab;

  return {
    workspaces,
    activeWorkspaceId: resolvedActiveWorkspaceId,
    tabs,
    activeTabId: resolvedActiveTabId,
    messagesByTab,
    diffsByWorkspace,
    fileTreeByWorkspace,
    diffsLoadingByWorkspace,
    configsByWorkspace
  };
};

const reducer = (state: StoreState, action: StoreAction): StoreState => {
  switch (action.type) {
    case 'set-active-workspace': {
      return { ...state, activeWorkspaceId: action.id };
    }
    case 'set-tabs': {
      return { ...state, tabs: action.tabs };
    }
    case 'set-active-tab': {
      return { ...state, activeTabId: action.id };
    }
    case 'add-tab': {
      if (state.tabs.some((t) => t.id === action.tab.id)) return state;
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
        messagesByTab: { ...state.messagesByTab, [action.tab.id]: [] }
      };
    }
    case 'remove-tab': {
      const remaining = state.tabs.filter((t) => t.id !== action.tabId);
      if (remaining.length === 0) return state;
      const newActiveId = state.activeTabId === action.tabId ? remaining[0].id : state.activeTabId;
      const { [action.tabId]: _, ...restMessages } = state.messagesByTab;
      return { ...state, tabs: remaining, activeTabId: newActiveId, messagesByTab: restMessages };
    }
    case 'set-tab-dirty': {
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, isDirty: action.isDirty } : t
        )
      };
    }
    case 'update-tab': {
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, ...action.updates } : t
        )
      };
    }
    case 'add-tab-message': {
      const existing = state.messagesByTab[action.tabId] || [];
      return {
        ...state,
        messagesByTab: { ...state.messagesByTab, [action.tabId]: [...existing, action.message] }
      };
    }
    case 'clear-tab-messages': {
      return {
        ...state,
        messagesByTab: { ...state.messagesByTab, [action.tabId]: [] }
      };
    }
    case 'set-workspaces': {
      const activeWorkspaceId =
        state.activeWorkspaceId && action.workspaces.some((ws) => ws.id === state.activeWorkspaceId)
          ? state.activeWorkspaceId
          : action.workspaces[0]?.id ?? null;
      return { ...state, workspaces: action.workspaces, activeWorkspaceId };
    }
    case 'add-workspace': {
      if (state.workspaces.some((ws) => ws.id === action.workspace.id)) {
        return state;
      }
      return {
        ...state,
        workspaces: [...state.workspaces, action.workspace],
        activeWorkspaceId: action.workspace.id
      };
    }
    case 'set-workspace-diffs': {
      return {
        ...state,
        diffsByWorkspace: {
          ...state.diffsByWorkspace,
          [action.workspaceId]: action.diffs
        }
      };
    }
    case 'set-workspace-file-tree': {
      return {
        ...state,
        fileTreeByWorkspace: {
          ...state.fileTreeByWorkspace,
          [action.workspaceId]: action.fileTree
        }
      };
    }
    case 'set-workspace-diffs-loading': {
      return {
        ...state,
        diffsLoadingByWorkspace: {
          ...state.diffsLoadingByWorkspace,
          [action.workspaceId]: action.isLoading
        }
      };
    }
    case 'update-workspace-notes': {
      return {
        ...state,
        workspaces: state.workspaces.map((ws) =>
          ws.id === action.workspaceId ? { ...ws, notes: action.notes } : ws
        )
      };
    }
    case 'set-workspace-config': {
      return {
        ...state,
        configsByWorkspace: {
          ...state.configsByWorkspace,
          [action.workspaceId]: action.config
        }
      };
    }
    default:
      return state;
  }
};

const StoreContext = createContext<StoreContextValue | null>(null);

export const ConductorStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, defaultState, (initialState) => {
    if (typeof window === 'undefined') return initialState;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialState;
      const parsed = JSON.parse(raw) as Partial<StoreState>;
      return mergeState(parsed);
    } catch (error) {
      console.warn('Failed to load local store state', error);
      return initialState;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist local store state', error);
    }
  }, [state]);

  const actions = useMemo<StoreActions>(
    () => ({
      setActiveWorkspace: (id) => dispatch({ type: 'set-active-workspace', id }),
      setTabs: (tabs) => dispatch({ type: 'set-tabs', tabs }),
      setActiveTab: (id) => dispatch({ type: 'set-active-tab', id }),
      addWorkspace: (workspace) => dispatch({ type: 'add-workspace', workspace }),
      setWorkspaces: (workspaces) => dispatch({ type: 'set-workspaces', workspaces }),
      addTab: (tab) => dispatch({ type: 'add-tab', tab }),
      removeTab: (tabId) => dispatch({ type: 'remove-tab', tabId }),
      setTabDirty: (tabId, isDirty) => dispatch({ type: 'set-tab-dirty', tabId, isDirty }),
      updateTab: (tabId, updates) => dispatch({ type: 'update-tab', tabId, updates }),
      addTabMessage: (tabId, message) => dispatch({ type: 'add-tab-message', tabId, message }),
      clearTabMessages: (tabId) => dispatch({ type: 'clear-tab-messages', tabId }),
      setWorkspaceDiffs: (workspaceId, diffs) =>
        dispatch({ type: 'set-workspace-diffs', workspaceId, diffs }),
      setWorkspaceFileTree: (workspaceId, fileTree) =>
        dispatch({ type: 'set-workspace-file-tree', workspaceId, fileTree }),
      setWorkspaceDiffsLoading: (workspaceId, isLoading) =>
        dispatch({ type: 'set-workspace-diffs-loading', workspaceId, isLoading }),
      updateWorkspaceNotes: (workspaceId, notes) =>
        dispatch({ type: 'update-workspace-notes', workspaceId, notes }),
      setWorkspaceConfig: (workspaceId, config) =>
        dispatch({ type: 'set-workspace-config', workspaceId, config })
    }),
    []
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useConductorStore = (): StoreContextValue => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useConductorStore must be used within ConductorStoreProvider');
  }
  return context;
};
