import { useState, useEffect, useCallback } from 'react';

export interface Script {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

export type ScriptStatus = 'idle' | 'running' | 'completed' | 'failed' | 'stopped';

export interface RunningScript {
  scriptId: string;
  pid?: number;
  status: ScriptStatus;
  output: string[];
  startTime?: number;
  endTime?: number;
  exitCode?: number;
}

const DEFAULT_SCRIPTS: Script[] = [
  { id: 'dev', name: 'dev', command: 'npm run dev' },
  { id: 'build', name: 'build', command: 'npm run build' },
  { id: 'test', name: 'test', command: 'npm run test' },
];

const STORAGE_KEY = 'cluso_scripts';

export function useScripts() {
  const [scripts, setScripts] = useState<Script[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load scripts from localStorage', e);
    }
    return DEFAULT_SCRIPTS;
  });

  const [runningScripts, setRunningScripts] = useState<Record<string, RunningScript>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
    } catch (e) {
      console.error('Failed to save scripts to localStorage', e);
    }
  }, [scripts]);

  const addScript = useCallback((script: Script) => {
    setScripts(prev => {
      if (prev.some(s => s.id === script.id)) {
        return prev;
      }
      return [...prev, script];
    });
  }, []);

  const removeScript = useCallback((id: string) => {
    setScripts(prev => prev.filter(s => s.id !== id));
    setRunningScripts(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  }, []);

  const updateScript = useCallback((id: string, partial: Partial<Script>) => {
    setScripts(prev => prev.map(s => s.id === id ? { ...s, ...partial } : s));
  }, []);

  const appendOutput = useCallback((id: string, text: string) => {
    setRunningScripts(prev => {
      const current = prev[id];
      if (!current) return prev;
      
      return {
        ...prev,
        [id]: {
          ...current,
          output: [...current.output, text]
        }
      };
    });
  }, []);

  const runScript = useCallback((id: string) => {
    const script = scripts.find(s => s.id === id);
    if (!script) {
      console.error(`Script with id ${id} not found`);
      return;
    }

    setRunningScripts(prev => ({
      ...prev,
      [id]: {
        scriptId: id,
        status: 'running',
        output: [`> ${script.command}\n`],
        startTime: Date.now(),
        pid: Math.floor(Math.random() * 10000) + 1000
      }
    }));

    const isLongRunning = script.command.includes('dev') || script.command.includes('watch') || script.command.includes('start');
    
    setTimeout(() => {
      appendOutput(id, `Starting ${script.name}...\n`);
    }, 500);

    if (!isLongRunning) {
      setTimeout(() => {
        appendOutput(id, `\n${script.name} completed successfully.\n`);
        setRunningScripts(prev => {
          const current = prev[id];
          if (!current) return prev;
          return {
            ...prev,
            [id]: {
              ...current,
              status: 'completed',
              endTime: Date.now(),
              exitCode: 0
            }
          };
        });
      }, 3000);
    } else {
      const interval = setInterval(() => {
        setRunningScripts(prev => {
          const current = prev[id];
          if (!current || current.status !== 'running') {
            clearInterval(interval);
            return prev;
          }
          return {
            ...prev,
            [id]: {
              ...current,
              output: [...current.output, `[${new Date().toLocaleTimeString()}] Working...\n`]
            }
          };
        });
      }, 2000);
    }

  }, [scripts, appendOutput]);

  const stopScript = useCallback((id: string) => {
    setRunningScripts(prev => {
      const current = prev[id];
      if (!current || current.status !== 'running') return prev;

      return {
        ...prev,
        [id]: {
          ...current,
          status: 'stopped',
          endTime: Date.now(),
          output: [...current.output, '\nProcess terminated by user.\n']
        }
      };
    });
  }, []);

  const clearOutput = useCallback((id: string) => {
    setRunningScripts(prev => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          output: []
        }
      };
    });
  }, []);

  return {
    scripts,
    runningScripts,
    addScript,
    removeScript,
    updateScript,
    runScript,
    stopScript,
    clearOutput
  };
}
