import { useState, useEffect, useCallback } from 'react';

export type WorkspaceItemType = 'file' | 'folder' | 'link' | 'action';

export interface WorkspaceItem {
  id: string;
  name: string;
  type: WorkspaceItemType;
  icon?: string;
  path?: string;
}

export interface WorkspaceSection {
  id: string;
  title: string;
  items: WorkspaceItem[];
  isCollapsed?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  path: string;
  gitBranch?: string;
  lastOpened: number;
  sections: WorkspaceSection[];
}

export interface UseWorkspacesReturn {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | undefined;
  addWorkspace: (workspace: Omit<Workspace, 'lastOpened' | 'sections'>) => void;
  removeWorkspace: (id: string) => void;
  switchWorkspace: (id: string) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  reorderSections: (workspaceId: string, sections: WorkspaceSection[]) => void;
}

const STORAGE_KEY = 'ai-cluso-workspaces';
const ACTIVE_WORKSPACE_KEY = 'ai-cluso-active-workspace';

const DEFAULT_SECTIONS: WorkspaceSection[] = [
  {
    id: 'project',
    title: 'Project',
    items: [],
    isCollapsed: false
  },
  {
    id: 'plans',
    title: 'Plans',
    items: [],
    isCollapsed: false
  },
  {
    id: 'canvas',
    title: 'Canvas',
    items: [],
    isCollapsed: false
  }
];

const DEFAULT_WORKSPACE: Workspace = {
  id: 'default',
  name: 'Default Project',
  path: '/',
  lastOpened: Date.now(),
  sections: DEFAULT_SECTIONS
};

export function useWorkspaces(): UseWorkspacesReturn {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    if (typeof window === 'undefined') return [DEFAULT_WORKSPACE];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [DEFAULT_WORKSPACE];
    } catch (e) {
      console.error('Failed to load workspaces from localStorage', e);
      return [DEFAULT_WORKSPACE];
    }
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return DEFAULT_WORKSPACE.id;

    try {
      const storedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const storedWorkspaces = localStorage.getItem(STORAGE_KEY);
      const parsedWorkspaces: Workspace[] = storedWorkspaces ? JSON.parse(storedWorkspaces) : [DEFAULT_WORKSPACE];
      
      if (storedId && parsedWorkspaces.some(w => w.id === storedId)) {
        return storedId;
      }
      
      return parsedWorkspaces.length > 0 ? parsedWorkspaces[0].id : DEFAULT_WORKSPACE.id;
    } catch (e) {
      return DEFAULT_WORKSPACE.id;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch (e) {
      console.error('Failed to save workspaces to localStorage', e);
    }
  }, [workspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
      try {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
      } catch (e) {
        console.error('Failed to save active workspace ID', e);
      }
    }
  }, [activeWorkspaceId]);

  const addWorkspace = useCallback((newWorkspaceData: Omit<Workspace, 'lastOpened' | 'sections'>) => {
    const newWorkspace: Workspace = {
      ...newWorkspaceData,
      lastOpened: Date.now(),
      sections: DEFAULT_SECTIONS
    };

    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
  }, []);

  const removeWorkspace = useCallback((id: string) => {
    setWorkspaces(prev => {
      const filtered = prev.filter(w => w.id !== id);
      
      if (filtered.length === 0) {
        return [DEFAULT_WORKSPACE];
      }
      
      if (id === activeWorkspaceId) {
        setActiveWorkspaceId(filtered[0].id);
      }
      
      return filtered;
    });
  }, [activeWorkspaceId]);

  const switchWorkspace = useCallback((id: string) => {
    setWorkspaces(prev => {
      const workspaceExists = prev.some(w => w.id === id);
      if (!workspaceExists) return prev;

      setActiveWorkspaceId(id);
      
      return prev.map(w => 
        w.id === id ? { ...w, lastOpened: Date.now() } : w
      );
    });
  }, []);

  const updateWorkspace = useCallback((id: string, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === id ? { ...w, ...updates } : w
    ));
  }, []);

  const reorderSections = useCallback((workspaceId: string, sections: WorkspaceSection[]) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === workspaceId ? { ...w, sections } : w
    ));
  }, []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    addWorkspace,
    removeWorkspace,
    switchWorkspace,
    updateWorkspace,
    reorderSections
  };
}
