
import React from 'react';
import { Terminal, ClipboardList, Palette } from 'lucide-react';

export const FLEET_CATEGORIES = [
  { id: 'Nanobrowser', icon: <Terminal size={14} />, label: 'Workspaces' },
  { id: 'Plans', icon: <ClipboardList size={14} />, label: 'Plans' },
  { id: 'Canvas', icon: <Palette size={14} />, label: 'Canvas' },
];

export const SYSTEM_INSTRUCTION = `You are Conductor, an elite local-first AI coding orchestrator.
You manage isolated git worktrees.
Always wrap tool calls in trace blocks. 
Available Trace Types: Thinking, Lint, Edit, Bash, Read, Plan.
Format your response with a clear 'Summary' header.
Use Markdown for rich text.
When proposing a plan, use the 'Plan' trace type to describe steps.`;

export const MOCK_FILE_TREE = [];
