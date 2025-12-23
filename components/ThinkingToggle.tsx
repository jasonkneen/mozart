import React from 'react';
import { ThinkingLevel } from '../types';
import { Zap, Brain, Rocket } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';

interface ThinkingToggleProps {
  level: ThinkingLevel;
  onChange: (level: ThinkingLevel) => void;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

const ThinkingToggle: React.FC<ThinkingToggleProps> = ({ level, onChange, usage }) => {
  const levels = [
    { id: ThinkingLevel.None, icon: <Zap size={14} />, label: 'Standard', color: 'text-gray-400', dots: 0 },
    { id: ThinkingLevel.Low, icon: <Brain size={14} />, label: 'Low', color: 'text-blue-400', dots: 1 },
    { id: ThinkingLevel.Medium, icon: <Brain size={14} />, label: 'Medium', color: 'text-indigo-400', dots: 2 },
    { id: ThinkingLevel.High, icon: <Brain size={14} />, label: 'High', color: 'text-purple-400', dots: 3 },
    { id: ThinkingLevel.Megathink, icon: <Rocket size={14} />, label: 'Mega', color: 'text-pink-400', dots: 4 },
  ];

  const currentLevel = levels.find(l => l.id === level) || levels[0];

  const renderDots = () => {
    // Vertical stack of 3 dots
    // Top dot (index 2) - filled if dots >= 3
    // Middle dot (index 1) - filled if dots >= 2
    // Bottom dot (index 0) - filled if dots >= 1
    
    const dotClass = (filled: boolean) => cn(
      "w-1 h-1 rounded-full transition-all duration-300",
      filled ? "bg-current opacity-100" : "bg-white/20 opacity-50"
    );

    return (
      <div className={cn("flex flex-col gap-[2px]", currentLevel.color)}>
        <div className={dotClass(currentLevel.dots >= 3)} />
        <div className={dotClass(currentLevel.dots >= 2)} />
        <div className={dotClass(currentLevel.dots >= 1)} />
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {usage && (
        <div className="text-[10px] text-white/30 font-mono px-2">
          {usage.totalTokens.toLocaleString()} tokens
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none">
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            title={`Thinking Level: ${currentLevel.label}`}
          >
              <Brain size={16} className={cn("transition-colors", currentLevel.color)} />
              {renderDots()}
          </div>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        {levels.map((l) => (
          <DropdownMenuItem
            key={l.id}
            onClick={() => onChange(l.id)}
            className={cn("justify-between cursor-pointer", level === l.id && "bg-white/10")}
          >
            <div className="flex items-center gap-2">
                <span className={l.color}>{l.icon}</span>
                <span>{l.label}</span>
            </div>
          </DropdownMenuItem>
        ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ThinkingToggle;
