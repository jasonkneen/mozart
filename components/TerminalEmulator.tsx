import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { init, Terminal, FitAddon } from 'ghostty-web';

export interface TerminalRef {
  terminal: Terminal | null;
  fit: () => void;
  clear: () => void;
  write: (data: string) => void;
  writeln: (data: string) => void;
  focus: () => void;
}

interface TerminalEmulatorProps {
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  initialContent?: string;
  className?: string;
}

const TerminalEmulator = forwardRef<TerminalRef, TerminalEmulatorProps>(({
  onData,
  onResize,
  initialContent,
  className
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);

  useImperativeHandle(ref, () => ({
    terminal: terminalRef.current,
    fit: () => fitAddonRef.current?.fit(),
    clear: () => terminalRef.current?.clear(),
    write: (data: string) => terminalRef.current?.write(data),
    writeln: (data: string) => terminalRef.current?.writeln(data),
    focus: () => terminalRef.current?.focus(),
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    let term: Terminal;
    let fitAddon: FitAddon;
    let resizeObserver: ResizeObserver;

    const initTerminal = async () => {
      await init();

      term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 13,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#09090b',
          foreground: '#e4e4e7',
          cursor: '#a1a1aa',
          selectionBackground: 'rgba(161, 161, 170, 0.3)',
          black: '#27272a',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#d946ef',
          cyan: '#06b6d4',
          white: '#f4f4f5',
          brightBlack: '#52525b',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#facc15',
          brightBlue: '#60a5fa',
          brightMagenta: '#e879f9',
          brightCyan: '#22d3ee',
          brightWhite: '#fafafa',
        },
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      if (containerRef.current) {
        term.open(containerRef.current);
        fitAddon.fit();
      }

      terminalRef.current = term;
      fitAddonRef.current = fitAddon;
      setIsReady(true);

      if (initialContent) {
        term.write(initialContent);
      }

      if (onData) {
        term.onData(onData);
      }

      if (onResize) {
        term.onResize((size: { cols: number; rows: number }) => {
          onResize(size.cols, size.rows);
        });
        onResize(term.cols, term.rows);
      }

      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          fitAddon.fit();
          if (onResize && terminalRef.current) {
            onResize(terminalRef.current.cols, terminalRef.current.rows);
          }
        });
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
    };

    initTerminal();

    return () => {
      resizeObserver?.disconnect();
      term?.dispose();
    };
  }, []);

  useEffect(() => {
    const term = terminalRef.current;
    if (!term || !onData || !isReady) return;
    
    const disposable = term.onData(onData);
    return () => {
      disposable.dispose();
    };
  }, [onData, isReady]);

  return (
    <div 
      className={`h-full w-full overflow-hidden bg-neutral-950 ${className || ''}`}
      ref={containerRef}
    />
  );
});

TerminalEmulator.displayName = 'TerminalEmulator';

export default TerminalEmulator;
