# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mozart AI Orchestrator** (ai-Mozart) is a React-based web UI for orchestrating AI coding agents in isolated git worktrees. It provides a workspace management interface where each workspace maps to a git branch/worktree, enabling parallel AI-assisted development.

## Development Commands

```bash
# Install dependencies
npm install

# Run both frontend and backend together (two terminals required)
npm run dev          # Frontend (Vite dev server, port 3000)
npm run dev:server   # Backend server (ports 4545 + 54545)

# Build for production
npm run build

# Preview production build
npm run preview
```

## Authentication

Mozart uses **OAuth with Claude/Anthropic** for authentication. No API keys required.

### How it works:
1. Start the backend server (`npm run dev:server`)
2. Open the frontend (`npm run dev`)
3. Click "Login to Claude" button in the top-right corner
4. Authorize the app in the popup window
5. You'll be redirected back and can start chatting

### OAuth Flow Details:
- **OAuth Callback Port**: 54545 (separate from API server)
- **Token Storage**: `~/.mozart/oauth-config.json` (encrypted)
- **Token Refresh**: Automatic when token expires

## Architecture

### Frontend (Vite + React 19 + TypeScript)

```
/
├── App.tsx              # Main app component, orchestrates workspace/chat state
├── index.tsx            # React entry point with ConductorStoreProvider
├── types.ts             # TypeScript type definitions (Workspace, Message, Agent, etc.)
├── constants.tsx        # System instructions and fleet categories
├── components/          # React components (Sidebar, ChatInterface, VersionControl, etc.)
└── services/
    ├── store.tsx        # React context store with localStorage persistence
    ├── agentService.ts  # Chat API client (calls backend /api/chat)
    ├── oauthService.ts  # OAuth flow management (login, logout, status)
    └── gitService.ts    # Git operations client (calls backend API)
```

### Backend (Node.js HTTP server)

```
server/
├── index.js             # Main server with API routes and OAuth callback handler
│                        # Port 4545: API endpoints
│                        # Port 54545: OAuth callback receiver
└── oauth.js             # OAuth handlers (PKCE flow, token management)
```

### Key Data Flow

1. **Store** (`services/store.tsx`): Manages all UI state - workspaces, messages, diffs, tabs. Persists to localStorage.
2. **OAuth Service**: Manages Claude authentication via OAuth PKCE flow.
3. **Agent Service**: Sends chat requests to `/api/chat` which uses OAuth token for Claude API.
4. **Git Service**: Calls backend API at `/api/*` for git operations.
5. **Backend**: Creates git worktrees, handles OAuth, proxies Claude API requests.

## Environment Variables

Optional configuration (via env or defaults):

### Backend server config:
- `CONDUCTOR_SERVER_PORT` - API server port (default: 4545)
- `CONDUCTOR_WORKSPACES_ROOT` - Worktree storage (default: ~/conductor/workspaces)
- `CONDUCTOR_REPOS_ROOT` - Cloned repos (default: ~/conductor/repos)

### Frontend config (in `.env.local`):
- `VITE_DEFAULT_REPO_PATH` - Default repo for workspace creation
- `VITE_CONDUCTOR_API_BASE` - API base URL (default: /api)

## Key Types

Located in `types.ts`:
- `Workspace` - Git workspace with branch, status, diffs metadata
- `Message` - Chat message with optional tool traces and plans
- `ThinkingLevel` - None | Think | Megathink (maps to token budget)
- `FileDiff`, `FileNode` - Git diff and file tree structures

## API Endpoints

The Vite dev server proxies `/api/*` to `http://localhost:4545`. Main endpoints:

### OAuth
- `GET /api/oauth/status` - Get authentication status
- `POST /api/oauth/start` - Start OAuth login flow
- `GET /api/oauth/token` - Get current access token
- `POST /api/oauth/logout` - Clear stored tokens

### Chat
- `POST /api/chat` - Send message to Claude (requires auth)

### Workspaces
- `POST /api/workspaces` - Create new workspace (git worktree)
- `GET /api/workspaces/:id/diffs` - Get file diffs
- `GET /api/workspaces/:id/files` - Get file tree
- `POST /api/repos/branch-exists` - Check if branch exists
