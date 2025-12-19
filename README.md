<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Zpo6GBINWZH72qXJBYakITzyu15zweEk

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Optional) Start the local git service:
   `npm run dev:server`
4. Run the app:
   `npm run dev`

To use real git workspaces, set `VITE_DEFAULT_REPO_PATH` in `.env.local` to a local git repo path.
You can also open a local repo or clone from a URL via the “Add repository” menu in the sidebar.
