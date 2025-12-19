import React, { useRef, useEffect, useState, useCallback } from 'react';
import TerminalEmulator, { TerminalRef } from './TerminalEmulator';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface ConnectedTerminalProps {
  cwd?: string;
  className?: string;
}

const ConnectedTerminal: React.FC<ConnectedTerminalProps> = ({ 
  cwd = process.cwd?.() || '~',
  className 
}) => {
  const terminalRef = useRef<TerminalRef>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const connect = useCallback(async () => {
    try {
      setConnectionState('connecting');
      setErrorMessage('');

      const port = await window.electronAPI?.pty?.getPort();
      if (!port) {
        setConnectionState('error');
        setErrorMessage('PTY server not available');
        return;
      }

      const cols = terminalRef.current?.terminal?.cols || 80;
      const rows = terminalRef.current?.terminal?.rows || 24;
      const encodedCwd = encodeURIComponent(cwd);
      
      const ws = new WebSocket(`ws://127.0.0.1:${port}?cols=${cols}&rows=${rows}&cwd=${encodedCwd}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        terminalRef.current?.focus();
      };

      ws.onmessage = (event) => {
        if (terminalRef.current) {
          terminalRef.current.write(event.data);
        }
      };

      ws.onerror = () => {
        setConnectionState('error');
        setErrorMessage('Connection failed');
      };

      ws.onclose = () => {
        if (connectionState === 'connected') {
          setConnectionState('disconnected');
        }
        wsRef.current = null;
      };
    } catch (err) {
      setConnectionState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [cwd, connectionState]);

  const handleTerminalData = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const handleTerminalResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const statusColors: Record<ConnectionState, string> = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    disconnected: 'bg-zinc-500',
    error: 'bg-red-500',
  };

  const statusLabels: Record<ConnectionState, string> = {
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
  };

  return (
    <div className={`relative flex flex-col h-full ${className || ''}`}>
      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[connectionState]}`} />
          <span className="text-xs text-zinc-400">{statusLabels[connectionState]}</span>
          {errorMessage && (
            <span className="text-xs text-red-400">— {errorMessage}</span>
          )}
        </div>
        
        {(connectionState === 'disconnected' || connectionState === 'error') && (
          <button
            onClick={connect}
            className="px-2 py-0.5 text-xs font-medium text-zinc-300 bg-zinc-800 rounded hover:bg-zinc-700 transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Terminal */}
      <div className="flex-1 min-h-0">
        <TerminalEmulator
          ref={terminalRef}
          onData={handleTerminalData}
          onResize={handleTerminalResize}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default ConnectedTerminal;
