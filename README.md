# Digital Invites AI — Wedding Invite Platform

A Next.js application that enables users to book, customize, and generate AI-powered video wedding invitations using their reference photos.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤖 Developing with AI Agents

If you are using AI agents or LLM coding assistants to work on this project, please follow these guidelines:

### Codebase Graph (`/graphify`)
To help agents navigate this project's structure, run the `/graphify` slash command in your chat interface.
This will instantly generate a fresh `graphify-out` map of the codebase explicitly tied to your current local checkout and branch. **Do not commit these graph files to git**; generate them locally whenever you need them.

### Mock Mode for Avatars
If you want to test the full end-to-end flow without spending API credits for AI avatar generation, ensure `FAL_API_KEY` is commented out in your `.env.local`. The system will automatically use a deterministic, offline `MockAvatarProvider` to generate local placeholder avatars.
