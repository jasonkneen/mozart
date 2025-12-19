---
inclusion: fileMatch
fileMatchPattern: 'server/**/*.js'
---

# Backend Development Standards

## Server Architecture

Plain Node.js HTTP server (no Express):
```javascript
import http from 'node:http';

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    sendError(res, 500, 'Internal server error');
  });
});
```

## Request Handling

### JSON Body Parsing
```javascript
const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};
```

### Response Helpers
```javascript
const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const sendError = (res, status, message) => {
  sendJson(res, status, { error: message });
};
```

## Git Operations

Use `execFile` with promisify for safety:
```javascript
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

const git = async (args, cwd) => {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
};
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/workspaces` | Create workspace (worktree) |
| GET | `/api/workspaces/:id/diffs` | Get file diffs |
| GET | `/api/workspaces/:id/files` | Get file tree |
| POST | `/api/repos/branch-exists` | Check branch existence |
| GET | `/api/health` | Health check |

## State Persistence

Server state stored in `server/state.json`:
```javascript
{
  workspaces: {
    "ws-123": {
      id: "ws-123",
      path: "/path/to/worktree",
      repoPath: "/path/to/repo",
      branch: "feature-branch",
      baseBranch: "main"
    }
  }
}
```

## Environment Variables

```bash
CONDUCTOR_SERVER_PORT=4545      # Server port
CONDUCTOR_WORKSPACES_ROOT=...   # Worktree storage
CONDUCTOR_REPOS_ROOT=...        # Cloned repos
CONDUCTOR_STATE_PATH=...        # State file location
```
