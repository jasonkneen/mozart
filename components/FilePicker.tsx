
import React, { useState, useEffect } from 'react';
import {
  Folder, FolderOpen, FileCode, ChevronRight, ChevronDown,
  HardDrive, Home, ArrowUp, RefreshCw, Search, X, Check
} from 'lucide-react';
import { SkeletonFileTree } from './ui/skeleton';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isHidden?: boolean;
}

interface FilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  mode?: 'directory' | 'file' | 'both';
  title?: string;
  initialPath?: string;
}

const FilePicker: React.FC<FilePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  mode = 'directory',
  title = 'Select Folder',
  initialPath
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);

  // Fetch directory contents from server
  const fetchDirectory = async (dirPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/files/browse?path=${encodeURIComponent(dirPath)}`);
      if (!response.ok) {
        throw new Error('Failed to load directory');
      }
      const data = await response.json();
      setEntries(data.entries || []);
      setCurrentPath(data.path || dirPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDirectory(currentPath || '~');
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    setSelectedPath(null);
    fetchDirectory(path);
  };

  const handleSelect = (entry: FileEntry) => {
    if (entry.isDirectory) {
      if (mode === 'directory') {
        setSelectedPath(entry.path);
      } else {
        handleNavigate(entry.path);
      }
    } else if (mode === 'file' || mode === 'both') {
      setSelectedPath(entry.path);
    }
  };

  const handleDoubleClick = (entry: FileEntry) => {
    if (entry.isDirectory) {
      handleNavigate(entry.path);
    } else if (mode === 'file' || mode === 'both') {
      onSelect(entry.path);
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onSelect(selectedPath);
      onClose();
    } else if (mode === 'directory' && currentPath) {
      onSelect(currentPath);
      onClose();
    }
  };

  const handleGoUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    handleNavigate(parentPath);
  };

  const handleGoHome = () => {
    handleNavigate('~');
  };

  const filteredEntries = entries
    .filter(e => showHidden || !e.isHidden)
    .filter(e => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-[700px] max-h-[80vh] bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Bar */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <button
            onClick={handleGoUp}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Go up"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={handleGoHome}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Home"
          >
            <Home size={16} />
          </button>
          <button
            onClick={() => fetchDirectory(currentPath)}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <div className="flex-1 mx-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
              <HardDrive size={14} className="text-white/40" />
              <span className="text-sm text-white/80 truncate font-mono">{currentPath}</span>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
            />
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {error && (
            <div className="p-4 text-center text-red-400 text-sm">{error}</div>
          )}

          {isLoading && (
            <div className="p-4">
              <SkeletonFileTree count={8} depth={2} />
            </div>
          )}

          {!isLoading && !error && filteredEntries.length === 0 && (
            <div className="p-8 text-center text-white/40 text-sm">
              {searchQuery ? 'No matching files' : 'Empty directory'}
            </div>
          )}

          {!isLoading && !error && filteredEntries.map((entry) => (
            <div
              key={entry.path}
              onClick={() => handleSelect(entry)}
              onDoubleClick={() => handleDoubleClick(entry)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedPath === entry.path
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              {entry.isDirectory ? (
                <FolderOpen size={18} className="text-blue-400" />
              ) : (
                <FileCode size={18} className="text-white/40" />
              )}
              <span className={`text-sm ${entry.isHidden ? 'text-white/30' : 'text-white/80'}`}>
                {entry.name}
              </span>
              {entry.isDirectory && (
                <ChevronRight size={14} className="ml-auto text-white/20" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            Show hidden files
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={mode === 'file' && !selectedPath}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              {mode === 'directory' ? 'Select Folder' : 'Select'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePicker;
