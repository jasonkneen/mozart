
import React from 'react';
import { ThinkingLevel } from '../types';
import { Zap, Brain, Rocket } from 'lucide-react';

interface ThinkingToggleProps {
  level: ThinkingLevel;
  onChange: (level: ThinkingLevel) => void;
}

const ThinkingToggle: React.FC<ThinkingToggleProps> = ({ level, onChange }) => {
  const levels = [
    { id: ThinkingLevel.None, icon: <Zap size={14} />, label: 'Standard', color: 'text-gray-400' },
    { id: ThinkingLevel.Think, icon: <Brain size={14} />, label: 'Think', color: 'text-blue-400' },
    { id: ThinkingLevel.Megathink, icon: <Rocket size={14} />, label: 'Ultra', color: 'text-purple-400' },
  ];

  return (
    <div className="flex items-center p-1 bg-white/5 rounded-lg border border-white/10">
      {levels.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            level === l.id 
              ? 'bg-white/10 text-white shadow-sm' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <span className={level === l.id ? l.color : ''}>{l.icon}</span>
          {l.label}
        </button>
      ))}
    </div>
  );
};

export default ThinkingToggle;
