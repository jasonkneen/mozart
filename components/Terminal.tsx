import React, { useEffect, useRef, useState, useCallback } from 'react'
import { init, Terminal as GhosttyTerminal, FitAddon } from 'ghostty-web'

interface TerminalProps {
  workspacePath?: string
  className?: string
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

const Terminal: React.FC<TerminalProps> = ({ workspacePath, className }) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const ghosttyRef = useRef<GhosttyTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const initRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')

  const connectToPty = useCallback((term: GhosttyTerminal) => {
    const wsUrl = `ws://localhost:4545/api/terminal${workspacePath ? `?cwd=${encodeURIComponent(workspacePath)}` : ''}`
    console.log('Connecting to PTY:', wsUrl)

    try {
      setConnectionStatus('connecting')
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('PTY WebSocket connected')
        setConnectionStatus('connected')
        setError(null)
        
        if (fitAddonRef.current) {
          fitAddonRef.current.fit()
          const cols = term.cols
          const rows = term.rows
          ws.send(JSON.stringify({ type: 'resize', cols, rows }))
        }
      }

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'resize') return
          } catch {
            // Not JSON, treat as terminal data
          }
        }
        term.write(event.data)
      }

      ws.onerror = (e) => {
        console.error('PTY WebSocket error:', e)
        setConnectionStatus('error')
        setError('Failed to connect to terminal server. Is the backend running?')
      }

      ws.onclose = () => {
        console.log('PTY WebSocket closed')
        setConnectionStatus('disconnected')
      }

      const dataDisposable = term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data)
        }
      })

      return () => {
        dataDisposable.dispose()
      }

    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setConnectionStatus('error')
      setError('Failed to connect to terminal server')
    }
  }, [workspacePath])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    if (!terminalRef.current) {
      console.error('Terminal ref not available')
      return
    }

    let cleanup: (() => void) | undefined
    let resizeObserver: ResizeObserver

    const initTerminal = async () => {
      console.log('Initializing Ghostty terminal...')
      
      await init()
      
      const term = new GhosttyTerminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 13,
        fontFamily: 'Geist Mono, SF Mono, Monaco, Menlo, monospace',
        theme: {
          background: '#050505',
          foreground: '#E5E5E5',
          cursor: '#60A5FA',
          cursorAccent: '#050505',
          selectionBackground: '#3B82F680',
          selectionForeground: '#FFFFFF',
          black: '#1A1A1A',
          red: '#EF4444',
          green: '#22C55E',
          yellow: '#EAB308',
          blue: '#3B82F6',
          magenta: '#A855F7',
          cyan: '#06B6D4',
          white: '#E5E5E5',
          brightBlack: '#404040',
          brightRed: '#F87171',
          brightGreen: '#4ADE80',
          brightYellow: '#FACC15',
          brightBlue: '#60A5FA',
          brightMagenta: '#C084FC',
          brightCyan: '#22D3EE',
          brightWhite: '#FFFFFF',
        },
        scrollback: 10000,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)

      if (terminalRef.current) {
        term.open(terminalRef.current)
        
        requestAnimationFrame(() => {
          fitAddon.fit()
        })
      }

      ghosttyRef.current = term
      fitAddonRef.current = fitAddon

      console.log('Ghostty terminal opened')

      cleanup = connectToPty(term)

      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          if (fitAddonRef.current && ghosttyRef.current) {
            fitAddonRef.current.fit()
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'resize',
                cols: ghosttyRef.current.cols,
                rows: ghosttyRef.current.rows
              }))
            }
          }
        })
      })

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current)
      }
    }

    initTerminal().catch(err => {
      console.error('Failed to initialize terminal:', err)
      setError('Failed to initialize terminal')
      setConnectionStatus('error')
    })

    return () => {
      resizeObserver?.disconnect()
      cleanup?.()
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (ghosttyRef.current) {
        ghosttyRef.current.dispose()
        ghosttyRef.current = null
      }
      initRef.current = false
    }
  }, [connectToPty])

  const handleReconnect = () => {
    if (ghosttyRef.current) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      ghosttyRef.current.clear()
      connectToPty(ghosttyRef.current)
    }
  }

  return (
    <div className={`relative flex flex-col h-full ${className || ''}`}>
      <div
        ref={terminalRef}
        className="flex-1 w-full overflow-hidden min-h-[200px]"
        style={{
          backgroundColor: '#050505',
          padding: '8px',
        }}
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        {connectionStatus === 'connecting' && (
          <div className="px-2 py-1 bg-yellow-500/20 rounded text-[10px] text-yellow-400 flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            Connecting...
          </div>
        )}
        {connectionStatus === 'connected' && (
          <div className="px-2 py-1 bg-green-500/20 rounded text-[10px] text-green-400 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            Connected
          </div>
        )}
        {connectionStatus === 'disconnected' && (
          <button
            onClick={handleReconnect}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white/60 flex items-center gap-1 transition-colors"
          >
            <div className="w-2 h-2 bg-white/40 rounded-full" />
            Reconnect
          </button>
        )}
        {connectionStatus === 'error' && (
          <button
            onClick={handleReconnect}
            className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-[10px] text-red-400 flex items-center gap-1 transition-colors"
          >
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            Retry
          </button>
        )}
      </div>
      {error && connectionStatus === 'error' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 max-w-sm text-center">
          <p className="font-medium mb-1">Terminal Error</p>
          <p className="text-xs text-red-400/70">{error}</p>
          <button
            onClick={handleReconnect}
            className="mt-3 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-xs transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

export default Terminal
