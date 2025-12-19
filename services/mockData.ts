import { FileDiff, FileNode } from '../types';

export const mockFileTree: FileNode[] = [
  { name: '.cursor', type: 'directory', path: '/.cursor' },
  { name: '.github', type: 'directory', path: '/.github' },
  { name: '.husky', type: 'directory', path: '/.husky' },
  { name: '.turbo', type: 'directory', path: '/.turbo' },
  { name: 'chrome-extension', type: 'directory', path: '/chrome-extension' },
  { name: 'dist', type: 'directory', path: '/dist' },
  { name: 'node_modules', type: 'directory', path: '/node_modules' },
  { name: 'package.json', type: 'file', path: '/package.json' },
  { name: 'README.md', type: 'file', path: '/README.md' }
];

export const mockDiffs: FileDiff[] = [
  { path: 'src/App.tsx', added: 2, removed: 5, status: 'modified' },
  { path: 'src/core/conductor/WorkspaceAPI.ts', added: 53, removed: 1, status: 'modified' },
  { path: 'src/ui/components/FileBadge.tsx', added: 2, removed: 3, status: 'modified' },
  { path: 'src/ui/components/RepositoryDetailsDialog.tsx', added: 225, removed: 117, status: 'modified' },
  { path: 'src/ui/hooks/useWorkspaceContext.ts', added: 8, removed: 0, status: 'modified' }
];
