
import React from 'react';
import { Terminal, ClipboardList, Palette, Search } from 'lucide-react';

export const FLEET_CATEGORIES = [
  { id: 'Nanobrowser', icon: <Terminal size={14} />, label: 'nanobrowser' },
  { id: 'Plans', icon: <ClipboardList size={14} />, label: 'plans' },
  { id: 'Canvas', icon: <Palette size={14} />, label: 'canvas' },
];

export const MOCK_FILE_TREE = [
  { name: '.cluso', type: 'directory', path: '/.cluso' },
  { name: '.cursor', type: 'directory', path: '/.cursor' },
  { name: '.github', type: 'directory', path: '/.github' },
  { name: '.husky', type: 'directory', path: '/.husky' },
  { name: '.turbo', type: 'directory', path: '/.turbo' },
  { name: 'chrome-extension', type: 'directory', path: '/chrome-extension' },
  { name: 'dist', type: 'directory', path: '/dist' },
  { name: 'node_modules', type: 'directory', path: '/node_modules' },
  { name: 'package.json', type: 'file', path: '/package.json' },
  { name: 'README.md', type: 'file', path: '/README.md' },
];

export const SYSTEM_INSTRUCTION = `You are Conductor, an elite local-first AI coding orchestrator.
You manage isolated git worktrees.
Always wrap tool calls in trace blocks. 
Available Trace Types: Thinking, Lint, Edit, Bash, Read, Plan.
Format your response with a clear 'Summary' header.
Use Markdown for rich text.
When proposing a plan, use the 'Plan' trace type to describe steps.`;
