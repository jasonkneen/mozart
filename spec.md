# Conductor — Product Spec (PRD + Feature Checklist)

This document combines:

1. a **PRD-style specification** (what Conductor is, who it’s for, how it works), and
2. a **deduplicated feature checklist** derived from the changelog, grouped by capability rather than raw releases.

---

## 1. Product Requirements Document (PRD)

### Product name

**Conductor**

### One-line description

Conductor is a **local-first desktop app** for running multiple AI coding agents (Claude Code and Codex) in **parallel, isolated git workspaces** on your Mac, with first-class support for diffs, code review, PR workflows, and agent orchestration.

---

## Goals

* Let developers run **multiple coding agents at once** without conflicts
* Make AI-assisted coding **reviewable, reversible, and auditable**
* Remove friction around git worktrees, branches, PRs, and reviews
* Keep everything **local, fast, and transparent**

---

## Non-goals

* Cloud-based IDE replacement
* Autonomous agents that bypass human review
* Replacing git, GitHub, or existing CI systems

---

## Target users

* **Senior engineers** working across multiple branches/PRs
* **Founders** shipping fast with AI assistance
* **Teams** reviewing AI-generated changes safely
* **Power users** of Claude Code and Codex who want parallelism

---

## Core mental model

> **One agent = one workspace = one git worktree**

Each agent operates in isolation, but the human can oversee, review, and merge everything from a single UI.

---

## How Conductor works (canonical flow)

### 1. Add your repo

* User adds a local repo, GitHub repo, or Git URL
* Conductor clones it locally
* All work happens **entirely on the user’s Mac**
* Each workspace is backed by a **git worktree**

### 2. Deploy agents

* User spins up one or more agents (Claude Code or Codex)
* Each agent gets:

  * Its own isolated workspace
  * Its own branch / worktree
  * Independent chat history and diffs

### 3. Conduct

* User sees all active workspaces at a glance
* User can:

  * Inspect diffs
  * Review AI-generated changes
  * Fetch PR comments
  * Revert, fork, or archive work
  * Merge via normal git / GitHub flows

---

## Supported agents & models

* **Claude Code**

  * Uses whatever login the user already has (API key, Pro, or Max)
* **OpenAI Codex**

  * GPT-5, GPT-5.1, GPT-5.2 variants
  * Multiple reasoning levels (including xhigh / extra-high)

---

## Key product pillars

### A. Safety & control

* All changes are visible as diffs
* One-click revert and chat checkpointing
* Agents cannot edit outside their workspace
* No hidden background changes

### B. Parallelism

* Multiple agents running at the same time
* Multiple repos and directories per workspace
* Independent chats and terminals

### C. Local-first performance

* Runs entirely on macOS
* Uses native git, gh, shell, PATH
* Optimized rendering for large repos and long chats

---

## Success metrics

* Time to ship PRs with AI assistance
* Number of parallel workspaces used per repo
* Reduction in manual git worktree management
* User trust (revert usage, review usage)
* Retention among power users

---

## Open questions

* Windows/Linux roadmap
* Team/shared workspace support
* Agent marketplace or templates
* Policy controls for enterprise environments

---

---

## 2. Feature Checklist (Grouped & Deduplicated)

### A. Workspace & repository management

* Create workspaces from:

  * Local repos
  * GitHub repos
  * Existing branches
  * Pull requests
  * Linear issues
* Each workspace is a **git worktree**
* Workspace storage under `~/conductor/workspaces/`
* Fork workspaces (copy changes + chat summary)
* Pin workspaces
* Mark workspaces unread
* Search workspaces by repo, branch, or PR number
* Restore archived workspaces
* Multi-repo workspaces via `/add-dir`

---

### B. Agent & model orchestration

* Claude Code support (bundled)
* Codex support (GPT-5.x family)
* Multiple agents per repo
* Sub-agent tool calls with visible prompts
* Auto mode (plan with one model, implement with another)
* Per-workspace model configuration
* Configurable reasoning levels
* Default model selection for reviews

---

### C. Chat & collaboration

* Multiple chat tabs per workspace
* Persistent chat history
* Auto-generated chat titles
* Notes tab / scratchpad
* `@notes` sharing with agents
* `@agent` mentions
* Message queues
* Conversation compaction
* Chat summaries attachable to new sessions

---

### D. Checkpointing & recovery

* Chat checkpoints (revert to prior turn)
* Turn-by-turn diffs
* Experimental git checkpoints (auto-commit per turn)
* One-click revert of agent changes
* Undo toast on archive
* Archive confirmation flows

---

### E. Diffs, files & code review

* Integrated diff viewer in chat
* Structural inline diffs
* Markdown preview in diffs
* Tufte markdown rendering toggle
* File-level diff comments
* Turn-by-turn diff history
* AI code review button
* Code review instruction indexing
* Clickable file paths in chat
* Copy file contents button
* File explorer with ⌘P search

---

### F. Git & PR workflows

* Git status in sidebar
* PR status indicators
* Checkout PRs directly
* Create PR with AI-generated title/description
* Fetch & sync GitHub PR comments
* Manually remove imported GitHub comments
* Suggested git actions for merge flow
* One-click pull/rebase
* GH CLI bundled
* Login via GH_TOKEN
* GitHub Enterprise support
* Fine-grained GitHub permissions

---

### G. Terminal & execution

* Integrated terminal per workspace
* Multiple terminal tabs
* Native shell + PATH usage
* Big Terminal Mode™
* Expand terminal to full height / full screen
* Run scripts (⌘R)
* Detect localhost servers and open in browser
* Send terminal output to chat (⌘L)
* WebGL terminal rendering
* Persistent terminal sessions

---

### H. Commands, plugins & MCPs

* Slash commands (`/clear`, `/compact`, etc.)
* Slash command autocomplete
* MCP server support
* One-click MCP installation
* MCP status indicators
* Plugin-based slash commands
* MCP visibility control per model

---

### I. Attachments & media

* Paste, drag-drop, or upload attachments
* Image uploads (with size handling)
* Text attachment previews
* Auto-convert large pastes to files
* `.log`, `.xlsx`, markdown support

---

### J. Settings & customization

* Provider selection (OpenAI, Anthropic, custom)
* Environment variable management
* Terminal font customization
* Monospace editor font customization
* Notification sound testing
* Session cost visibility toggle
* Auto-compact threshold settings
* Keyboard shortcut customization
* Fullscreen settings UI

---

### K. UX, performance & reliability

* Local-first architecture
* Fast fuzzy search (rewritten for large repos)
* Virtualized long chat rendering
* Reduced bundle size
* Reliable cancellation (ESC)
* Stable onboarding & auth flows
* Unicode & Mermaid rendering fixes
* Reduced UI jank and flicker
* Graceful handling of deleted repos
* Guardrails preventing out-of-workspace edits

---

## Summary

Conductor is best understood as a **control plane for AI coding agents**:
it gives each agent a safe, isolated environment, while giving humans full visibility and authority over what gets merged.

If you want, I can next:

* turn this into a **public-facing product spec**, or
* extract a **“Why Conductor vs Cursor” comparison**, or
* condense this into a **one-page internal spec** for onboarding or fundraising.
