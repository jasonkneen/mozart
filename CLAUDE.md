# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Conductor AI Orchestrator** (ai-Mozart) is a React-based web UI for orchestrating AI coding agents in isolated git worktrees. It provides a workspace management interface where each workspace maps to a git branch/worktree, enabling parallel AI-assisted development.

## Development Commands

```bash
# Install dependencies
npm install

# Run the frontend dev server (port 3000)
npm run dev

# Run the backend git service (port 4545) - required for real git operations
npm run dev:server

# Build for production
npm run build

# Preview production build
npm run preview
```

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
    ├── store.tsx        # Zustand-style React context store with localStorage persistence
    ├── agentService.ts  # Agent abstraction layer (supports Gemini or mock responses)
    ├── geminiService.ts # Google Gemini API integration
    ├── gitService.ts    # Git operations client (calls backend API or returns mock data)
    └── mockData.ts      # Mock diffs and file trees for development
```

### Backend (Node.js HTTP server)

```
server/
└── index.js             # Git worktree management service
                         # Creates workspaces, fetches diffs, manages file trees
                         # Uses native git commands via child_process
```

### Key Data Flow

1. **Store** (`services/store.tsx`): Manages all UI state - workspaces, messages, diffs, tabs. Persists to localStorage.
2. **Agent Service**: Routes prompts to either Gemini (if `VITE_USE_GEMINI` env var set) or returns mock responses.
3. **Git Service**: Calls backend API at `/api/*` for real git operations. Falls back to mock data if server unavailable.
4. **Backend**: Creates git worktrees, parses `git status`/`git diff`, builds file trees.

## Environment Variables

Create `.env.local` with:

```bash
GEMINI_API_KEY=your-key      # Required for Gemini AI responses
VITE_USE_GEMINI=true         # Enable Gemini (otherwise mock responses)
VITE_DEFAULT_REPO_PATH=/path # Default repo for workspace creation
VITE_CONDUCTOR_API_BASE=/api # API base URL (default: /api)
```

Backend server config (via env or defaults):
- `CONDUCTOR_SERVER_PORT` - Server port (default: 4545)
- `CONDUCTOR_WORKSPACES_ROOT` - Worktree storage (default: ~/conductor/workspaces)
- `CONDUCTOR_REPOS_ROOT` - Cloned repos (default: ~/conductor/repos)

## Key Types

Located in `types.ts`:
- `Workspace` - Git workspace with branch, status, diffs metadata
- `Message` - Chat message with optional tool traces and plans
- `ThinkingLevel` - None | Think | Megathink (maps to Gemini thinking budget)
- `FileDiff`, `FileNode` - Git diff and file tree structures

## Frontend/Backend Communication

The Vite dev server proxies `/api/*` to `http://localhost:4545`. Main endpoints:
- `POST /api/workspaces` - Create new workspace (git worktree)
- `GET /api/workspaces/:id/diffs` - Get file diffs
- `GET /api/workspaces/:id/files` - Get file tree
- `POST /api/repos/branch-exists` - Check if branch exists
