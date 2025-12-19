---
inclusion: fileMatch
fileMatchPattern: 'package.json|vite.config.ts|tsconfig.json'
---

# Development Environment

## Prerequisites
- Node.js (ES2022 compatible)
- Git CLI
- GitHub CLI (`gh`) for full git integration

## Quick Start

```bash
# Install dependencies
npm install

# Start frontend dev server (port 3000)
npm run dev

# Start backend git service (port 4545) - separate terminal
npm run dev:server

# Build for production
npm run build
```

## Vite Configuration

Dev server proxies `/api/*` to backend:
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:4545',
      changeOrigin: true
    }
  }
}
```

## Environment Variables

Create `.env.local`:
```bash
# Required for AI responses
GEMINI_API_KEY=your-api-key

# Optional
VITE_USE_GEMINI=true              # Enable Gemini (else mock)
VITE_DEFAULT_REPO_PATH=/path      # Default repo for workspaces
VITE_CONDUCTOR_API_BASE=/api      # API base URL
```

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:
```typescript
// Use @/ for project root imports
import { types } from '@/types';
import { store } from '@/services/store';
```

## TypeScript Config

- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx (automatic runtime)
- No emit (Vite handles transpilation)

## Data Flow Without Backend

When backend is unavailable:
1. `gitService` catches API errors
2. Falls back to mock data from `services/mockData.ts`
3. `agentService` returns mock responses unless `VITE_USE_GEMINI=true`

This allows frontend development without running the backend.
