# AGENTS.md

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Frontend dev server (Vite, port 3000)
npm run dev:server   # Backend server (port 4545) - run in separate terminal
npm run build        # Production build
```
No test/lint commands configured.

## Code Style
- **TypeScript**: ES2022 target, ESNext modules, `@/*` path alias maps to root
- **Components**: Functional only with hooks, typed as `React.FC<Props>`
- **Naming**: PascalCase (components, types), camelCase (functions, variables), `handle*` prefix for event handlers
- **Imports**: React first → external libs (lucide-react, clsx) → local (`../services/`, `../types`)
- **Types**: Defined in `types.ts`, no `I` prefix for interfaces, use enums for fixed values
- **State**: Use `useConductorStore()` hook from `services/store.tsx` for shared state
- **Styling**: Tailwind CSS inline classes, dark theme (`bg-[#0A0A0A]`, `text-white/60`)
- **Error handling**: `try/catch` with `console.error()`, return fallback data on failure
- **Async effects**: Use `cancelled` flag pattern to prevent state updates after unmount
