import { spawn } from 'node-pty';
import os from 'node:os';

const DEFAULT_SHELL = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/zsh';

// Store active PTY sessions
const ptySessions = new Map();

export const createPtySession = (sessionId, cwd = process.cwd()) => {
  const shell = DEFAULT_SHELL;
  const args = os.platform() === 'win32' ? [] : ['-l'];

  const ptyProcess = spawn(shell, args, {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'en_US.UTF-8',
    },
  });

  ptySessions.set(sessionId, {
    pty: ptyProcess,
    cwd,
    createdAt: Date.now(),
  });

  return ptyProcess;
};

export const getPtySession = (sessionId) => {
  return ptySessions.get(sessionId);
};

export const destroyPtySession = (sessionId) => {
  const session = ptySessions.get(sessionId);
  if (session) {
    session.pty.kill();
    ptySessions.delete(sessionId);
  }
};

export const handleTerminalWebSocket = (ws, cwd) => {
  const sessionId = `pty-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const ptyProcess = createPtySession(sessionId, cwd);

    // Send PTY output to WebSocket
    ptyProcess.onData((data) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(data);
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      if (ws.readyState === 1) {
        ws.send(`\r\n\x1b[38;5;244m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
      }
      destroyPtySession(sessionId);
    });

    ws.on('message', (data) => {
      const session = getPtySession(sessionId);
      if (!session) return;
      
      const message = data.toString();
      
      try {
        const json = JSON.parse(message);
        if (json.type === 'resize' && typeof json.cols === 'number' && typeof json.rows === 'number') {
          session.pty.resize(json.cols, json.rows);
          return;
        }
      } catch {
      }
      
      session.pty.write(message);
    });

    // Cleanup on close
    ws.on('close', () => {
      destroyPtySession(sessionId);
    });

    ws.on('error', (error) => {
      console.error('Terminal WebSocket error:', error);
      destroyPtySession(sessionId);
    });

  } catch (error) {
    console.error('Failed to create PTY session:', error);
    ws.close(1011, 'Failed to create terminal session');
  }
};

export const resizePtySession = (sessionId, cols, rows) => {
  const session = ptySessions.get(sessionId);
  if (session) {
    session.pty.resize(cols, rows);
  }
};
