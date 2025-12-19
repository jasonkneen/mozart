
import React from 'react';
import { GitBranch, Edit3, Copy, Plus, Layout, Maximize2, Columns, ChevronDown, Package } from 'lucide-react';
import { Tab } from '../types';

interface TopBarProps {
  branch: string;
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  location: string;
}

const TopBar: React.FC<TopBarProps> = ({ branch, tabs, activeTabId, onTabSelect, location }) => {
  return (
    <div className="h-24 flex flex-col border-b border-white/5 bg-[#0A0A0A]">
      <div className="h-10 px-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded transition-colors group cursor-pointer">
            <GitBranch size={14} className="text-white/40" />
            <span className="text-xs font-mono text-white/80">{branch}</span>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit3 size={12} className="text-white/40 hover:text-white" />
              <Copy size={12} className="text-white/40 hover:text-white" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-[11px] text-white/60">
            <Package size={12} className="text-white/40" />
            <span className="font-mono">{location}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 rounded transition-colors cursor-pointer">
            <span className="text-xs text-white/60">Open in</span>
            <ChevronDown size={14} className="text-white/20" />
          </div>
          <div className="flex items-center gap-1 border-l border-white/10 pl-3">
            <button className="p-1.5 text-white/40 hover:text-white"><Columns size={14} /></button>
            <button className="p-1.5 text-white/40 hover:text-white"><Maximize2 size={14} /></button>
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={`h-full flex items-center gap-2 px-4 text-xs font-medium transition-all relative border-b-2 ${
              activeTabId === tab.id 
                ? 'text-white border-blue-500 bg-white/5' 
                : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/[0.02]'
            }`}
          >
            {tab.type === 'chat' ? (
              <div className="w-3 h-3 flex items-center justify-center">
                <div className="w-full h-full border border-white/20 rounded-full rotate-45 flex items-center justify-center">
                  <div className="w-[1px] h-full bg-white/40 absolute" />
                  <div className="w-full h-[1px] bg-white/40 absolute" />
                </div>
              </div>
            ) : (
              <span className="text-blue-400">📄</span>
            )}
            {tab.title}
          </button>
        ))}
        <button className="p-2 text-white/20 hover:text-white transition-colors ml-1">
          <Plus size={16} />
          <span className="ml-2 text-xs text-white/30">New Chat</span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
