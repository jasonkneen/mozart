# Git Workflow

## Branch Naming
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- AI agent branches: `ai/task-{timestamp}` (auto-generated)

## Commit Messages
Follow conventional commits:
```
type(scope): description

feat: add new component
fix: resolve workspace loading issue
chore: update dependencies
```

## Worktree Pattern

This project manages git worktrees for isolated workspaces:
- Each workspace = one git worktree = one branch
- Worktrees stored in `~/conductor/workspaces/`
- Cloned repos stored in `~/conductor/repos/`

### Backend Worktree Operations
```javascript
// Create new worktree with new branch
git worktree add -b <branch> <path> <baseBranch>

// Create worktree from existing branch
git worktree add <path> <branch>
```

## Pull Request Guidelines
- Create PR from feature branch to main
- Include clear description of changes
- Ensure frontend builds (`npm run build`)
- Test with dev server if backend changes
