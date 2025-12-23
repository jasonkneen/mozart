import React from 'react';
import { AlertTriangle, Check, X, Terminal, FileEdit, FilePlus, Code } from 'lucide-react';
import clsx from 'clsx';

export interface ToolApprovalRequest {
  approvalId: string;
  toolName: string;
  input: Record<string, unknown>;
  timestamp: number;
}

interface ToolApprovalCardProps {
  request: ToolApprovalRequest;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string, reason?: string) => void;
  isProcessing?: boolean;
}

// Get icon for tool type
const getToolIcon = (toolName: string) => {
  switch (toolName) {
    case 'Edit':
    case 'MultiEdit':
      return <FileEdit size={16} />;
    case 'Write':
      return <FilePlus size={16} />;
    case 'Bash':
      return <Terminal size={16} />;
    default:
      return <Code size={16} />;
  }
};

// Get color class for tool type
const getToolColor = (toolName: string) => {
  switch (toolName) {
    case 'Bash':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'Edit':
    case 'MultiEdit':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'Write':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    default:
      return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  }
};

// Format input for display
const formatInput = (toolName: string, input: Record<string, unknown>): React.ReactNode => {
  switch (toolName) {
    case 'Edit':
      return (
        <div className="space-y-2">
          <div className="text-white/60 text-xs">
            <span className="text-white/40">File:</span> {String(input.file_path || input.path || 'unknown')}
          </div>
          {input.old_string && (
            <div className="text-xs">
              <span className="text-red-400">- </span>
              <code className="text-red-300/80 bg-red-500/10 px-1 rounded">
                {String(input.old_string).slice(0, 100)}{String(input.old_string).length > 100 ? '...' : ''}
              </code>
            </div>
          )}
          {input.new_string && (
            <div className="text-xs">
              <span className="text-green-400">+ </span>
              <code className="text-green-300/80 bg-green-500/10 px-1 rounded">
                {String(input.new_string).slice(0, 100)}{String(input.new_string).length > 100 ? '...' : ''}
              </code>
            </div>
          )}
        </div>
      );

    case 'Write':
      return (
        <div className="space-y-2">
          <div className="text-white/60 text-xs">
            <span className="text-white/40">File:</span> {String(input.file_path || input.path || 'unknown')}
          </div>
          <div className="text-xs text-white/50">
            Content: {String(input.content || '').slice(0, 150)}{String(input.content || '').length > 150 ? '...' : ''}
          </div>
        </div>
      );

    case 'Bash':
      return (
        <div className="space-y-1">
          <div className="text-white/40 text-xs">Command:</div>
          <code className="text-white/80 bg-white/5 px-2 py-1 rounded text-xs block overflow-x-auto">
            {String(input.command || '')}
          </code>
        </div>
      );

    default:
      return (
        <pre className="text-xs text-white/60 bg-white/5 p-2 rounded overflow-x-auto max-h-32">
          {JSON.stringify(input, null, 2)}
        </pre>
      );
  }
};

export function ToolApprovalCard({
  request,
  onApprove,
  onReject,
  isProcessing = false
}: ToolApprovalCardProps) {
  const { approvalId, toolName, input, timestamp } = request;
  const colorClass = getToolColor(toolName);

  const timeAgo = Math.round((Date.now() - timestamp) / 1000);
  const timeDisplay = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.round(timeAgo / 60)}m ago`;

  return (
    <div className={clsx(
      'rounded-lg border p-4 animate-in fade-in slide-in-from-bottom-2',
      colorClass
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          <span className="font-medium text-yellow-300 text-sm">Tool Approval Required</span>
        </div>
        <span className="text-xs text-white/30">{timeDisplay}</span>
      </div>

      {/* Tool info */}
      <div className="flex items-center gap-2 mb-3">
        <div className={clsx('p-1.5 rounded', colorClass.replace('border-', 'bg-').replace('/30', '/20'))}>
          {getToolIcon(toolName)}
        </div>
        <span className="font-mono text-sm font-medium text-white/90">{toolName}</span>
      </div>

      {/* Input display */}
      <div className="mb-4">
        {formatInput(toolName, input)}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(approvalId)}
          disabled={isProcessing}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            'bg-green-600 hover:bg-green-500 text-white',
            isProcessing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Check size={14} />
          Approve
        </button>
        <button
          onClick={() => onReject(approvalId)}
          disabled={isProcessing}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            'bg-red-600/50 hover:bg-red-600 text-white/90',
            isProcessing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <X size={14} />
          Reject
        </button>
      </div>
    </div>
  );
}

export default ToolApprovalCard;
