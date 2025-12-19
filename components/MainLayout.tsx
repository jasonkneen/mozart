import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from 'lucide-react';
import { cn } from '../lib/utils';
import { WorkspaceSidebar, WorkspaceSidebarProps } from './WorkspaceSidebar';
import { ChatTabBar, ChatTab } from './ChatTabBar';
import { ChatPanelHeader } from './ChatPanelHeader';
import { RunTerminalPanel, TerminalTab } from './RunTerminalPanel';

export interface MainLayoutProps {
  // Sidebar props
  workspaceSections: WorkspaceSidebarProps['sections'];
  activeWorkspaceId: WorkspaceSidebarProps['activeWorkspaceId'];
  onSelectWorkspace: WorkspaceSidebarProps['onSelectWorkspace'];
  onNewWorkspace: WorkspaceSidebarProps['onNewWorkspace'];
  onDeleteWorkspace: WorkspaceSidebarProps['onDeleteWorkspace'];
  onPinWorkspace: WorkspaceSidebarProps['onPinWorkspace'];

  // Header props
  projectName?: string;
  gitBranch?: string;
  projectPath?: string;
  onOpenProject?: () => void;
  onProjectMenuOpen?: () => void;

  // Chat Tab props
  tabs: ChatTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;

  // Terminal props
  terminalTabs: TerminalTab[];
  activeTerminalTabId: string;
  onTerminalTabChange: (id: string) => void;
  onNewTerminal: () => void;
  onCloseTerminalTab: (id: string) => void;

  // Content
  children?: React.ReactNode;
  
  // Inspector
  showInspector?: boolean;
  inspectorContent?: React.ReactNode;
  onToggleInspector?: () => void;
  
  // Theme
  isDarkMode?: boolean;
}

export function MainLayout({
  workspaceSections,
  activeWorkspaceId,
  onSelectWorkspace,
  onNewWorkspace,
  onDeleteWorkspace,
  onPinWorkspace,
  projectName,
  gitBranch,
  projectPath,
  onOpenProject,
  onProjectMenuOpen,
  tabs,
  activeTabId,
  onTabChange,
  onNewTab,
  onCloseTab,
  terminalTabs,
  activeTerminalTabId,
  onTerminalTabChange,
  onNewTerminal,
  onCloseTerminalTab,
  children,
  showInspector = false,
  inspectorContent,
  onToggleInspector,
  isDarkMode = true,
}: MainLayoutProps) {
  // --- Layout State ---
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState(320);

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem('main-layout-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sidebarWidth) setSidebarWidth(parsed.sidebarWidth);
        if (parsed.isSidebarCollapsed !== undefined) setIsSidebarCollapsed(parsed.isSidebarCollapsed);
        if (parsed.terminalHeight) setTerminalHeight(parsed.terminalHeight);
        if (parsed.isTerminalCollapsed !== undefined) setIsTerminalCollapsed(parsed.isTerminalCollapsed);
        if (parsed.inspectorWidth) setInspectorWidth(parsed.inspectorWidth);
      } catch (e) {
        console.error('Failed to parse layout state', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('main-layout-state', JSON.stringify({
      sidebarWidth,
      isSidebarCollapsed,
      terminalHeight,
      isTerminalCollapsed,
      inspectorWidth
    }));
  }, [sidebarWidth, isSidebarCollapsed, terminalHeight, isTerminalCollapsed, inspectorWidth]);

  // --- Resizing Logic ---
  const isResizingSidebar = useRef(false);
  const isResizingTerminal = useRef(false);
  const isResizingInspector = useRef(false);

  const startResizingSidebar = useCallback(() => { isResizingSidebar.current = true; }, []);
  const startResizingTerminal = useCallback(() => { isResizingTerminal.current = true; }, []);
  const startResizingInspector = useCallback(() => { isResizingInspector.current = true; }, []);

  const stopResizing = useCallback(() => {
    isResizingSidebar.current = false;
    isResizingTerminal.current = false;
    isResizingInspector.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingSidebar.current) {
      const newWidth = Math.max(160, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    if (isResizingTerminal.current) {
      // Calculate height from bottom
      const newHeight = Math.max(100, Math.min(800, window.innerHeight - e.clientY));
      setTerminalHeight(newHeight);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }
    if (isResizingInspector.current) {
      const newWidth = Math.max(200, Math.min(800, window.innerWidth - e.clientX));
      setInspectorWidth(newWidth);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  return (
    <div className={cn(
      "flex h-screen w-full overflow-hidden font-sans",
      isDarkMode ? "bg-black text-neutral-200" : "bg-white text-neutral-900"
    )}>
      
      {/* --- Sidebar Area --- */}
      {!isSidebarCollapsed && (
        <div 
          className="relative flex-shrink-0 flex group"
          style={{ width: sidebarWidth }}
        >
          <div className="flex-1 overflow-hidden h-full">
             <WorkspaceSidebar 
               sections={workspaceSections}
               activeWorkspaceId={activeWorkspaceId}
               onSelectWorkspace={onSelectWorkspace}
               onNewWorkspace={onNewWorkspace}
               onDeleteWorkspace={onDeleteWorkspace}
               onPinWorkspace={onPinWorkspace}
               isDarkMode={isDarkMode}
             />
          </div>
          
          {/* Sidebar Resizer Handle */}
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-20 transition-colors opacity-0 group-hover:opacity-100",
              isDarkMode ? "hover:bg-blue-600/50" : "hover:bg-blue-400/50"
            )}
            onMouseDown={startResizingSidebar}
          />
        </div>
      )}

      {/* --- Main Content Area --- */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        
        {/* Header Section */}
        <div className="flex-shrink-0 relative group/header">
           <ChatPanelHeader 
             projectName={projectName}
             gitBranch={gitBranch}
             projectPath={projectPath}
             onOpenProject={onOpenProject}
             onProjectMenuOpen={onProjectMenuOpen}
             isDarkMode={isDarkMode}
           />
           
           {/* Sidebar Toggle (Overlay on Header) */}
           <button
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className={cn(
               "absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all z-20",
               isSidebarCollapsed 
                 ? (isDarkMode ? "bg-neutral-800 text-neutral-400 hover:text-neutral-200" : "bg-neutral-100 text-neutral-500 hover:text-neutral-800")
                 : "opacity-0 group-hover/header:opacity-100",
               !isSidebarCollapsed && (isDarkMode ? "hover:bg-neutral-800 text-neutral-500" : "hover:bg-neutral-200 text-neutral-400")
             )}
             title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
           >
             {isSidebarCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
           </button>

           {/* Inspector Toggle (Right side overlay) */}
           {onToggleInspector && (
             <button
                onClick={onToggleInspector}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all z-20",
                   isDarkMode ? "hover:bg-neutral-800 text-neutral-500" : "hover:bg-neutral-200 text-neutral-400"
                )}
                title={showInspector ? "Hide Inspector" : "Show Inspector"}
             >
               {showInspector ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
             </button>
           )}
        </div>

        {/* Chat Tabs */}
        <div className="flex-shrink-0">
          <ChatTabBar 
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={onTabChange}
            onCloseTab={onCloseTab}
            onNewTab={onNewTab}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Middle Content + Terminal */}
        <div className="flex flex-1 flex-col min-h-0 relative">
          
          {/* Chat/Main Content */}
          <div className="flex-1 overflow-hidden relative min-h-0">
             {children}
          </div>

          {/* Terminal Resizer */}
          {!isTerminalCollapsed && (
            <div
              className={cn(
                "h-1 cursor-row-resize z-20 w-full flex-shrink-0 transition-colors",
                isDarkMode ? "hover:bg-blue-600/50 bg-neutral-900" : "hover:bg-blue-400/50 bg-neutral-100"
              )}
              onMouseDown={startResizingTerminal}
            />
          )}

          {/* Terminal Panel */}
          <div 
             style={{ height: isTerminalCollapsed ? 'auto' : terminalHeight }}
             className={cn(
               "flex-shrink-0 flex flex-col min-h-0 transition-[height]",
             )}
          >
             <RunTerminalPanel
               tabs={terminalTabs}
               activeTabId={activeTerminalTabId}
               isCollapsed={isTerminalCollapsed}
               onToggleCollapse={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
               onSelectTab={onTerminalTabChange}
               onCloseTab={onCloseTerminalTab}
               onNewTerminal={onNewTerminal}
               isDarkMode={isDarkMode}
             />
          </div>
        </div>
      </div>

      {/* --- Inspector Area --- */}
      {showInspector && (
        <>
          <div
             className={cn(
               "w-1 cursor-col-resize z-20 flex-shrink-0 transition-colors",
               isDarkMode ? "hover:bg-blue-600/50 bg-neutral-900" : "hover:bg-blue-400/50 bg-neutral-100"
             )}
             onMouseDown={startResizingInspector}
          />
          <div 
            className="flex-shrink-0 overflow-hidden flex flex-col"
            style={{ width: inspectorWidth }}
          >
            {inspectorContent || (
              <div className={cn("flex-1 p-4", isDarkMode ? "bg-neutral-900" : "bg-white")}>
                <span className="text-neutral-500">Inspector</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
