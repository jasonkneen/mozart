# Project Standards and Guidelines

## Code Style

### TypeScript
- Target ES2022, use ESNext modules
- Use `@/*` path alias for imports (maps to project root)
- Prefer explicit types over `any`
- Use enums for fixed sets of values (see `types.ts` for patterns)

### React Components
- Functional components with hooks only
- Props interfaces defined inline above component
- Named exports for sub-components, default export for main component
- State co-located in components when single-use, lifted to store when shared

### Naming Conventions
- Components: PascalCase (`ChatInterface.tsx`)
- Services: camelCase with Service suffix (`geminiService.ts`)
- Types: PascalCase, no `I` prefix for interfaces
- Event handlers: `handle` prefix (`handleSubmit`, `handleScroll`)

## File Organization

```
/
├── components/     # React components (one component per file)
├── services/       # Business logic and API clients
├── server/         # Backend Node.js server
├── types.ts        # Shared TypeScript types
└── constants.tsx   # App-wide constants and config
```

## State Management

### Store Pattern (`services/store.tsx`)
- React Context + useReducer pattern
- Actions via dispatch, exposed through `useConductorStore()` hook
- Persists to localStorage with `STORAGE_KEY` prefix
- Workspace-scoped data stored in records keyed by `workspaceId`

### State Shape
```typescript
{
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  messages: Record<string, Message[]>;      // keyed by workspaceId
  diffsByWorkspace: Record<string, FileDiff[]>;
  fileTreeByWorkspace: Record<string, FileNode[]>;
}
```

## Error Handling

- Log errors with `console.error()` or `console.warn()`
- Services return mock/fallback data when API unavailable
- No user-facing error UI currently - fail gracefully

## CSS/Styling

- Tailwind CSS via inline classes
- Dark theme: backgrounds `#0A0A0A`, `#0D0D0D`, `#1A1A1A`
- Text colors: `text-white/60`, `text-white/40` for secondary
- Borders: `border-white/5`, `border-white/10`
- Hover states: `hover:bg-white/5`, `hover:text-white`
- Animations: `animate-in fade-in slide-in-from-bottom-2`
