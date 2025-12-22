
import React, { useState, useMemo } from 'react';
import { FileDiff, DiffHunk } from '../types';
import {
  FileCode, Plus, Minus, ChevronDown, ChevronRight,
  Copy, Check, ExternalLink, Eye, EyeOff
} from 'lucide-react';

interface DiffViewerProps {
  diff: FileDiff;
  hunks?: DiffHunk[];
  onClose?: () => void;
}

type ViewMode = 'split' | 'unified';

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, hunks = [], onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [expandedHunks, setExpandedHunks] = useState<Set<number>>(new Set([0]));
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const toggleHunk = (index: number) => {
    const newExpanded = new Set(expandedHunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedHunks(newExpanded);
  };

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(diff.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse a diff line to determine its type
  const parseLine = (line: string) => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      return { type: 'add' as const, content: line.slice(1), prefix: '+' };
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      return { type: 'remove' as const, content: line.slice(1), prefix: '-' };
    }
    if (line.startsWith('@@')) {
      return { type: 'hunk' as const, content: line, prefix: '' };
    }
    return { type: 'context' as const, content: line.startsWith(' ') ? line.slice(1) : line, prefix: ' ' };
  };

  // Get file extension for syntax highlighting class
  const getLanguageClass = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      css: 'css',
      scss: 'scss',
      html: 'html',
      json: 'json',
      md: 'markdown',
      yaml: 'yaml',
      yml: 'yaml',
    };
    return langMap[ext] || 'plaintext';
  };

  const statusColors = {
    added: 'text-green-400',
    modified: 'text-yellow-400',
    deleted: 'text-red-400',
    renamed: 'text-blue-400',
  };

  return (
    <div className="flex flex-col h-full bg-surface text-primary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCode size={16} className={statusColors[diff.status]} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white/80 font-mono">{diff.path}</span>
            <button
              onClick={handleCopyPath}
              className="p-1 text-white/20 hover:text-white/60 transition-colors"
              title="Copy path"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">+{diff.added}</span>
            <span className="text-red-400">-{diff.removed}</span>
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                viewMode === 'unified' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                viewMode === 'split' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Split
            </button>
          </div>

          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1.5 rounded transition-colors ${
              showLineNumbers ? 'text-white/60 bg-white/5' : 'text-white/20'
            }`}
            title="Toggle line numbers"
          >
            {showLineNumbers ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        {hunks.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-sm">
            No diff data available. File may be binary or unchanged.
          </div>
        ) : (
          <div className="font-mono text-xs">
            {hunks.map((hunk, hunkIndex) => (
              <div key={hunkIndex} className="border-b border-white/5">
                {/* Hunk Header */}
                <button
                  onClick={() => toggleHunk(hunkIndex)}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-left"
                >
                  {expandedHunks.has(hunkIndex) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <span className="font-mono text-xs">{hunk.header}</span>
                </button>

                {/* Hunk Lines */}
                {expandedHunks.has(hunkIndex) && (
                  <div className={viewMode === 'split' ? 'flex' : ''}>
                    {viewMode === 'unified' ? (
                      <div className="w-full">
                        {hunk.lines.map((line, lineIndex) => {
                          const { type, content, prefix } = parseLine(line);
                          return (
                            <div
                              key={lineIndex}
                              className={`flex ${
                                type === 'add' ? 'bg-green-500/10' :
                                type === 'remove' ? 'bg-red-500/10' :
                                ''
                              }`}
                            >
                              {showLineNumbers && (
                                <span className="w-12 px-2 py-0.5 text-right text-white/20 border-r border-white/5 select-none shrink-0">
                                  {lineIndex + 1}
                                </span>
                              )}
                              <span className={`w-5 text-center py-0.5 select-none shrink-0 ${
                                type === 'add' ? 'text-green-400' :
                                type === 'remove' ? 'text-red-400' :
                                'text-white/20'
                              }`}>
                                {prefix}
                              </span>
                              <pre className={`flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto ${
                                type === 'add' ? 'text-green-300' :
                                type === 'remove' ? 'text-red-300' :
                                'text-white/60'
                              }`}>
                                {content || ' '}
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Split view
                      <>
                        <div className="w-1/2 border-r border-white/5">
                          {hunk.lines
                            .filter(line => !line.startsWith('+') || line.startsWith('+++'))
                            .map((line, lineIndex) => {
                              const { type, content } = parseLine(line);
                              return (
                                <div
                                  key={lineIndex}
                                  className={`flex ${type === 'remove' ? 'bg-red-500/10' : ''}`}
                                >
                                  {showLineNumbers && (
                                    <span className="w-12 px-2 py-0.5 text-right text-white/20 border-r border-white/5 select-none shrink-0">
                                      {lineIndex + 1}
                                    </span>
                                  )}
                                  <pre className={`flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto ${
                                    type === 'remove' ? 'text-red-300' : 'text-white/60'
                                  }`}>
                                    {content || ' '}
                                  </pre>
                                </div>
                              );
                            })}
                        </div>
                        <div className="w-1/2">
                          {hunk.lines
                            .filter(line => !line.startsWith('-') || line.startsWith('---'))
                            .map((line, lineIndex) => {
                              const { type, content } = parseLine(line);
                              return (
                                <div
                                  key={lineIndex}
                                  className={`flex ${type === 'add' ? 'bg-green-500/10' : ''}`}
                                >
                                  {showLineNumbers && (
                                    <span className="w-12 px-2 py-0.5 text-right text-white/20 border-r border-white/5 select-none shrink-0">
                                      {lineIndex + 1}
                                    </span>
                                  )}
                                  <pre className={`flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto ${
                                    type === 'add' ? 'text-green-300' : 'text-white/60'
                                  }`}>
                                    {content || ' '}
                                  </pre>
                                </div>
                              );
                            })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffViewer;
