import { File, Folder, Globe, MessageSquare, X } from 'lucide-react';

export interface ContextItem {
  type: 'file' | 'folder' | 'url' | 'comment';
  path: string;
  name: string;
  label?: string;
}

interface ContextBadgesProps {
  contexts: ContextItem[];
  onRemove: (path: string) => void;
}

export function ContextBadges({ contexts, onRemove }: ContextBadgesProps) {
  if (!contexts || contexts.length === 0) return null;

  const getIcon = (type: ContextItem['type']) => {
    switch (type) {
      case 'file':
        return <File className="w-3 h-3" />;
      case 'folder':
        return <Folder className="w-3 h-3" />;
      case 'url':
        return <Globe className="w-3 h-3" />;
      case 'comment':
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-2 px-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
      {contexts.map((ctx) => (
        <div
          key={ctx.path}
          className="group flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 rounded-full pl-2.5 pr-1.5 py-1 text-xs border border-zinc-700/50 hover:border-zinc-600 transition-all cursor-default max-w-[240px] shadow-sm"
          title={ctx.path}
        >
          <span className="opacity-70 flex-shrink-0 text-zinc-400 group-hover:text-zinc-300 transition-colors">
            {getIcon(ctx.type)}
          </span>
          <span className="truncate font-medium">
            {ctx.name}
          </span>
          {ctx.label && (
            <span className="text-[9px] uppercase text-zinc-500 ml-1">
              {ctx.label}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(ctx.path);
            }}
            className="flex-shrink-0 ml-0.5 p-0.5 rounded-full text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors"
            aria-label={`Remove ${ctx.name}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
