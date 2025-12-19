import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export type AgentState = 'idle' | 'thinking' | 'streaming' | 'tool-use' | 'error';

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function BrailleSpinner({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % BRAILLE_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);
  
  return <span className={className}>{BRAILLE_FRAMES[frame]}</span>;
}

interface AgentStatusIndicatorProps {
  status: AgentState;
  toolName?: string;
  message?: string;
  className?: string;
}

export function AgentStatusIndicator({
  status,
  toolName,
  message,
  className
}: AgentStatusIndicatorProps) {
  return (
    <div className={cn("flex items-center h-6 overflow-hidden", className)}>
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-zinc-500" />
          </motion.div>
        )}

        {status === 'thinking' && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 text-white/50"
          >
            <BrailleSpinner className="text-sm" />
            <span className="text-xs">Thinking...</span>
          </motion.div>
        )}

        {status === 'streaming' && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 text-white/50"
          >
            <BrailleSpinner className="text-sm" />
          </motion.div>
        )}

        {status === 'tool-use' && (
          <motion.div
            key="tool-use"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            className="flex items-center gap-1.5 text-white/50"
          >
            <BrailleSpinner className="text-sm" />
            <span className="text-xs truncate max-w-[150px]">
              {toolName || 'Running...'}
            </span>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 text-red-500"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium truncate max-w-[200px]">
              {message || "Error"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
