Great — I checked **the official Conductor docs at docs.conductor.build** and updated the spec with accurate info about how Conductor *actually works*, core features, and best practices from the docs. Here’s the **expanded and updated spec + checklist**, now fully aligned with the documentation.

---

# 📘 Conductor — Updated Product Specification (Docs + Changelog)

## 🧠 Overview (from docs.conductor.build)

**Conductor** is a **macOS desktop app** that lets you run *multiple AI coding agents in parallel* — especially **Claude Code** and **Codex** — each in its own **isolated workspace** where the agent can modify code, generate changes, and be reviewed/merged by a developer. ([docs.conductor.build][1])

Workspaces are backed by **git worktrees**, giving each agent its own branch and code copy, so teams can develop multiple features in parallel *safely and independently*. ([docs.conductor.build][2])

---

## 🔑 Product Goals (Updated)

**Primary goals**

* Enable parallel AI-assisted development workflows
* Provide clear, reversible, reviewable code changes
* Automate workspace setup and reproducible environment with scripts
* Reduce developer overhead for managing git worktrees, PRs, and reviews

**Secondary goals**

* Allow developers to use Conductor alongside their IDE
* Offer a low-friction onboarding and quick-first-workspace experience

**Non-goals**

* Not a cloud IDE — workspaces run locally on your Mac
* Not a fully autonomous code generator — human review remains central

---

## 🛠 How Conductor Works (Docs-Sourced Flow)

### 1️⃣ Add your repo

* Add a repo from a **local folder** or a **Git URL**.
* Conductor reads your GitHub login from your terminal (e.g., via `gh auth status`). ([docs.conductor.build][3])

### 2️⃣ Create workspace(s)

* Each workspace is an **isolated copy** of your repo on a new **git worktree** (one branch per workspace). ([docs.conductor.build][3])
* Conductor only copies files tracked in git at workspace creation.

### 3️⃣ Automate setup

* Use **setup scripts** in a `conductor.json` file to install dependencies, copy environment files (like `.env`), or prepare your workspace environment. ([docs.conductor.build][4])
* These scripts run automatically when a workspace is created.

### 4️⃣ Run your code

* Define a **run script** in `conductor.json` to start dev servers, tests, or builds, accessible via a “Run” button in the UI. ([docs.conductor.build][5])
* Run scripts receive a range of ports automatically (`CONDUCTOR_PORT` + 0–9). ([docs.conductor.build][6])

### 5️⃣ Conduct work

* Ask Claude Code or Codex to help develop features inside the workspace
* AI changes are manageable with diffs, checkpoints, and reviews

---

## 📚 Key Concepts (Docs + Changelog)

### 🧩 Workspaces & Branches

* Every workspace maps to a **Git branch**.
* You can create new workspaces from branches, issues, or PRs (⌘⇧N) and switch branches manually if needed. ([docs.conductor.build][2])
* Only *one workspace can check out a given branch at once*; to use the same branch elsewhere, create a new branch copy first. ([docs.conductor.build][2])

---

## 🚀 Updated Feature Checklist

*(Now fully validated against the docs)*

### **1) Workspace & Repository Management**

* Add repository (local or Git URL) and auto-create a workspace. ([docs.conductor.build][3])
* One workspace per Git branch (worktrees). ([docs.conductor.build][2])
* Create workspace from:

  * Branch
  * Pull request
  * Issue
    (via UI or `⌘⇧N`) ([docs.conductor.build][3])
* Workspace data stored locally (not nested inside project).
* Pin and manage multiple workspaces.
* Restore archived workspaces.

---

### **2) Parallel Agents**

* Run multiple Claude Code agents in isolated workspaces. ([docs.conductor.build][7])
* Automatic workspace isolation per agent. ([docs.conductor.build][7])

---

### **3) Scripts (conductor.json)**

* Support for:

  * `setup` script — configures workspace on creation. ([docs.conductor.build][5])
  * `run` script — starts servers/tests from a button. ([docs.conductor.build][5])
  * `archive` script — cleans external resources on archive. ([docs.conductor.build][5])
* `runScriptMode` settings (e.g., nonconcurrent). ([docs.conductor.build][5])

---

### **4) Environment Variables**

Conductor exposes useful environment variables for use in scripts:

* `CONDUCTOR_WORKSPACE_NAME`
* `CONDUCTOR_WORKSPACE_PATH`
* `CONDUCTOR_ROOT_PATH`
* `CONDUCTOR_DEFAULT_BRANCH`
* `CONDUCTOR_PORT`
  (all available in terminal and scripts) ([docs.conductor.build][8])

---

### **5) Diff Viewer & Code Review**

* AI-produced code diffs are visible in the app.
* In-line review and syntax-highlighted diffs.
* Review UI shows changed files, line diffs, and comments.

---

### **6) Checkpoints (Claude Code only)**

* Automatic snapshots of Claude Code changes per turn.
* Revert to prior turn to undo changes. ([docs.conductor.build][9])
* Checkpoints are stored independently of Git history. ([docs.conductor.build][9])

---

### **7) GitHub Integration**

* Fetch PR comments from GitHub.
* Sync comments into Conductor.
* Create PR branches and merge workflow.

---

### **8) Slash Commands & MCP**

* Slash commands for workspace/agent actions.
* MCP support for model context servers.

---

### **9) Terminal Integration**

* Integrated terminal per workspace.
* Full zshell support with environment variable access.
* `⌘L` to send terminal context to chat.
* Multiple terminal tabs supported.

---

### **10) Workflow Guides & Tutorials**

Docs include detailed how-to guides such as:

* “Setting up a workspace”
* “Running a workspace”
* “From Issue to PR”
* Running with VSCode or Cursor
* Quickstarts for frameworks like Next.js, Rails, Django

(Each available in the docs sidebar) ([docs.conductor.build][1])

---

## 🧠 Summary

Here’s what Conductor gives you *in practice*:

✅ **Local-first AI coding workspaces**
✅ **Automated environment setup via `conductor.json`**
✅ **Parallel AI agents with isolated branches**
✅ **Easy code review and PR workflows**
✅ **Scripted test/dev workflows built into UI**
✅ **Terminal + diff + code review + git all in one place**
📘 Fully documented at **docs.conductor.build** ([docs.conductor.build][1])

---

If you’d like, I can now generate any of the following from the updated docs + spec:

✨ A **user workflow tutorial** (step-by-step)
🚀 A **PRD for executives/investors**
📦 A **developer onboarding guide** for Conductor

Just tell me which you want next!

[1]: https://docs.conductor.build/?utm_source=chatgpt.com "Welcome - Conductor"
[2]: https://docs.conductor.build/tips/workspaces-and-branches?utm_source=chatgpt.com "Workspaces and branches - Conductor"
[3]: https://docs.conductor.build/first-workspace?utm_source=chatgpt.com "Your First Workspace - Conductor"
[4]: https://docs.conductor.build/guides/how-to-setup?utm_source=chatgpt.com "Setting up a workspace - Conductor"
[5]: https://docs.conductor.build/core/scripts?utm_source=chatgpt.com "Scripts - docs.conductor.build"
[6]: https://docs.conductor.build/guides/how-to-run?utm_source=chatgpt.com "Running a workspace - Conductor"
[7]: https://docs.conductor.build/core/parallel-agents?utm_source=chatgpt.com "Parallel Agents - Conductor"
[8]: https://docs.conductor.build/tips/conductor-env?utm_source=chatgpt.com "Conductor environment variables - Conductor"
[9]: https://docs.conductor.build/core/checkpoints?utm_source=chatgpt.com "Checkpoints - Conductor"
