import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { FileDiff, FileNode, Message, Tab, Workspace } from '../types';

type StoreState = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  tabs: Tab[];
  activeTabId: string;
  messages: Record<string, Message[]>;
  diffsByWorkspace: Record<string, FileDiff[]>;
  fileTreeByWorkspace: Record<string, FileNode[]>;
  diffsLoadingByWorkspace: Record<string, boolean>;
};

type StoreActions = {
  setActiveWorkspace: (id: string | null) => void;
  setTabs: (tabs: Tab[]) => void;
  setActiveTab: (id: string) => void;
  addWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addMessage: (workspaceId: string, message: Message) => void;
  setWorkspaceDiffs: (workspaceId: string, diffs: FileDiff[]) => void;
  setWorkspaceFileTree: (workspaceId: string, fileTree: FileNode[]) => void;
  setWorkspaceDiffsLoading: (workspaceId: string, isLoading: boolean) => void;
};

type StoreContextValue = {
  state: StoreState;
  actions: StoreActions;
};

type StoreAction =
  | { type: 'set-active-workspace'; id: string | null }
  | { type: 'set-tabs'; tabs: Tab[] }
  | { type: 'set-active-tab'; id: string }
  | { type: 'add-workspace'; workspace: Workspace }
  | { type: 'set-workspaces'; workspaces: Workspace[] }
  | { type: 'add-message'; workspaceId: string; message: Message }
  | { type: 'set-workspace-diffs'; workspaceId: string; diffs: FileDiff[] }
  | { type: 'set-workspace-file-tree'; workspaceId: string; fileTree: FileNode[] }
  | { type: 'set-workspace-diffs-loading'; workspaceId: string; isLoading: boolean };

const STORAGE_KEY = 'conductor.store.v1';

const createInitialState = (): StoreState => {
  const now = Date.now();

  const workspaces: Workspace[] = [
    {
      id: 'ws-5',
      name: 'Fix sidepanel issues',
      branch: 'fix-sidepanel-chat-issues',
      location: 'memphis',
      timeAgo: '3mo ago',
      status: 'idle',
      fleetType: 'Nanobrowser',
      repo: 'conductor',
      diffs: { added: 4, removed: 4 }
    },
    {
      id: 'ws-1',
      name: 'Floating Chat UI',
      branch: 'fix/floating-chat-ui-improvements',
      location: 'san-jose',
      timeAgo: 'Ready to merge',
      status: 'Ready to merge',
      fleetType: 'Nanobrowser',
      repo: 'conductor',
      diffs: { added: 312, removed: 332 },
      unread: true
    },
    {
      id: 'ws-2',
      name: 'Bilbao workspace',
      branch: 'jasonkneen/bilbao',
      location: 'bilbao',
      timeAgo: 'Initializing...',
      status: 'Initializing...',
      fleetType: 'Nanobrowser',
      repo: 'conductor',
      diffs: { added: 0, removed: 0 }
    },
    {
      id: 'ws-canvas-1',
      name: 'Bandung Component',
      branch: 'jasonkneen-bandung',
      location: 'bandung',
      timeAgo: '3mo ago',
      status: 'idle',
      fleetType: 'Canvas',
      repo: 'conductor',
      diffs: { added: 12, removed: 0 }
    }
  ];

  const messages: Record<string, Message[]> = {
    'ws-5': [
      {
        id: 'msg-1',
        role: 'assistant',
        content:
          "I've successfully fixed all the side panel issues mentioned. The changes ensure a cleaner user experience with no leftover messages and a properly sized input field that grows with content.",
        timestamp: now - 3600000,
        traces: [
          { type: 'Thinking', content: 'Inspecting side-panel package structure...' },
          { type: 'Lint', command: 'cd pages/side-panel && npx eslint src/SidePanel.tsx', status: 'completed', content: '' },
          { type: 'Edit', content: 'components/ChatInput.tsx', diff: { added: 12, removed: 4 }, status: 'completed' },
          { type: 'Thinking', content: 'Summary: Fixed auto-resize logic and input reset.' }
        ],
        plan: {
          title: 'Fix side panel issues',
          description: 'Cleaning up UI issues in the chat component',
          steps: [
            {
              label: 'Branch renamed',
              details: 'Changed from conductor/memphis to fix-sidepanel-chat-issues',
              completed: true
            },
            {
              label: 'Fixed leftover chat messages',
              details: 'Added state clearing logic when panel gains focus',
              completed: true
            },
            {
              label: 'Chat responsiveness',
              details: "Optimized Planner agent's web_task handling",
              completed: true
            },
            {
              label: 'Fixed input sizing',
              details: 'Improved auto-resize with 200px max height',
              completed: true
            }
          ]
        }
      }
    ]
  };

  return {
    workspaces,
    activeWorkspaceId: 'ws-5',
    tabs: [{ id: 't1', title: 'Claude', type: 'chat', active: true }],
    activeTabId: 't1',
    messages,
    diffsByWorkspace: {},
    fileTreeByWorkspace: {},
    diffsLoadingByWorkspace: {}
  };
};

const defaultState = createInitialState();

const mergeState = (loaded: Partial<StoreState> | null): StoreState => {
  if (!loaded) return defaultState;

  const workspaces = Array.isArray(loaded.workspaces) && loaded.workspaces.length
    ? loaded.workspaces
    : defaultState.workspaces;

  const tabs = Array.isArray(loaded.tabs) && loaded.tabs.length ? loaded.tabs : defaultState.tabs;
  const messages = loaded.messages && typeof loaded.messages === 'object'
    ? loaded.messages
    : defaultState.messages;
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

  const resolvedActiveWorkspaceId =
    loaded.activeWorkspaceId && workspaces.some((ws) => ws.id === loaded.activeWorkspaceId)
      ? loaded.activeWorkspaceId
      : workspaces[0]?.id ?? null;

  const resolvedActiveTabId =
    loaded.activeTabId && tabs.some((tab) => tab.id === loaded.activeTabId)
      ? loaded.activeTabId
      : tabs[0]?.id ?? '';

  return {
    workspaces,
    activeWorkspaceId: resolvedActiveWorkspaceId,
    tabs,
    activeTabId: resolvedActiveTabId,
    messages,
    diffsByWorkspace,
    fileTreeByWorkspace,
    diffsLoadingByWorkspace
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
        activeWorkspaceId: action.workspace.id,
        messages: { ...state.messages, [action.workspace.id]: state.messages[action.workspace.id] || [] }
      };
    }
    case 'add-message': {
      const existing = state.messages[action.workspaceId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.workspaceId]: [...existing, action.message]
        }
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
      addMessage: (workspaceId, message) => dispatch({ type: 'add-message', workspaceId, message }),
      setWorkspaceDiffs: (workspaceId, diffs) =>
        dispatch({ type: 'set-workspace-diffs', workspaceId, diffs }),
      setWorkspaceFileTree: (workspaceId, fileTree) =>
        dispatch({ type: 'set-workspace-file-tree', workspaceId, fileTree }),
      setWorkspaceDiffsLoading: (workspaceId, isLoading) =>
        dispatch({ type: 'set-workspace-diffs-loading', workspaceId, isLoading })
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
