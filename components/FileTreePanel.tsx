import React, { useState } from 'react';
import { 
  ChevronRight, 
  Folder, 
  FolderOpen, 
  File, 
  FileCode,
  FileJson,
  FileImage,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export type GitStatus = 'M' | 'A' | 'D' | 'U';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  gitStatus?: GitStatus;
}

interface FileTreePanelProps {
  files: TreeNode[];
  selectedPath?: string;
  onSelect?: (node: TreeNode) => void;
  className?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return <FileCode className="h-4 w-4 text-blue-400" />;
    case 'json':
    case 'yaml':
    case 'yml':
      return <FileJson className="h-4 w-4 text-yellow-400" />;
    case 'png':
    case 'jpg':
    case 'svg':
      return <FileImage className="h-4 w-4 text-purple-400" />;
    case 'md':
    case 'txt':
      return <FileText className="h-4 w-4 text-zinc-400" />;
    default:
      return <File className="h-4 w-4 text-zinc-500" />;
  }
};

const StatusBadge = ({ status }: { status?: GitStatus }) => {
  if (!status) return null;

  const config = {
    M: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'M' },
    A: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'A' },
    D: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'D' },
    U: { color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'U' },
  };

  const { color, bg, label } = config[status];

  return (
    <span className={cn(
      "ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-sm",
      color,
      bg
    )}>
      {label}
    </span>
  );
};

const FileTreeNode = ({ 
  node, 
  level, 
  selectedPath, 
  onSelect 
}: { 
  node: TreeNode; 
  level: number; 
  selectedPath?: string; 
  onSelect?: (node: TreeNode) => void; 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = node.path === selectedPath;
  const isFolder = node.type === 'folder';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelect?.(node);
    }
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex items-center gap-1.5 py-1 pr-2 text-sm transition-colors cursor-pointer",
          isSelected 
            ? "bg-zinc-800 text-white" 
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={handleClick}
      >
        {isFolder ? (
          <span className={cn("text-zinc-500 transition-transform", isOpen && "rotate-90")}>
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="w-3.5" /> 
        )}

        {isFolder ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 text-blue-400/80" />
          ) : (
            <Folder className="h-4 w-4 text-blue-400/80" />
          )
        ) : (
          getFileIcon(node.name)
        )}

        <span className="truncate flex-1">{node.name}</span>
        
        <StatusBadge status={node.gitStatus} />
      </div>

      <AnimatePresence initial={false}>
        {isFolder && isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function FileTreePanel({ 
  files, 
  selectedPath, 
  onSelect,
  className 
}: FileTreePanelProps) {
  return (
    <div className={cn("flex flex-col h-full bg-zinc-950 border-r border-zinc-800/50 overflow-hidden", className)}>
      <div className="p-3 border-b border-zinc-800/50 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Explorer</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {files.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            level={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export default FileTreePanel;
