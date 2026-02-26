# Ore AI

> Current phase: Design and Architecture

A playground for experimenting with AI agent workflows. The agent is built around my interests, has tools for my hobbies, and has a distinct personality. The code is mostly written by AI agents — the design, prompting, and review are not.

If you want to fork this as a starting point for your own agent, go for it.

---

## What Makes It a Fun Learning Experience

The agent-first workflow is the experiment. Most of the code gets written by AI, but the decisions about what to build, how it should behave, and whether the output is actually good — that stays human. The goal is to get better at agentic coding by actually doing it.

The stack is made up of tools that I enjoys using.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (React) |
| Hosting | Cloudflare Workers (Wrangler + Vite plugin) |
| Database | Cloudflare D1 |
| ORM | Drizzle |
| Auth | Better Auth (Google OAuth) |
| UI | shadcn/ui, Tailwind CSS v4 |
| Type Checking | tsgo (`@typescript/native-preview`) |
| Linting | Biome |
| Package Manager | Bun |

---

## Getting Started

**Prerequisites**

- Bun installed
- Cloudflare account authenticated with Wrangler
- For local (non-Codex) development: `.dev.vars` at the project root — copy from `.dev.vars.example` and fill in your secrets

```bash
bun install
bun dev
```

To test against a local MCP worker instead of the Cloudflare service binding, set:

```bash
MCP_SERVER_URL=http://localhost:8787/mcp
```

Make sure that you have your MCP server locally and that the PORT and PATH match the URL you provide.

To override the default agent system prompt without committing it, set this in your runtime env (for local dev in `.dev.vars`, for production via Cloudflare secret):

```bash
AGENT_SYSTEM_PROMPT=your prompt text here
```

For production, set it outside git with:

```bash
bunx wrangler secret put AGENT_SYSTEM_PROMPT
```

For larger production prompts, store the prompt as an R2 object and set only the object key as a secret:

```bash
bunx wrangler r2 object put <your-prompt-bucket>/prompts/main.txt --file ./prompts/main.txt
bunx wrangler secret put AGENT_SYSTEM_PROMPT_R2_KEY
# value: prompts/main.txt
```

Bind that bucket to the Worker as `AGENT_PROMPTS` (via Dashboard or your Wrangler config).

When `AGENT_SYSTEM_PROMPT` is empty/unset, the app will read from `AGENT_PROMPTS` using `AGENT_SYSTEM_PROMPT_R2_KEY`. If R2 prompt lookup fails, the app falls back to the built-in default prompt instead of failing the chat request.

---

## Using Git Worktrees with Codex

Codex creates and manages Git worktrees for you under `~/.codex/worktrees/`.

To make environment credentials available inside each Codex worktree, this repo uses `.codex/environments/environment.toml` to copy a shared `.dev.vars` file into the active worktree during setup.

Place your shared env file at:

```bash
$HOME/.config/ore-ai/.dev.vars
```

Recommended:

```bash
chmod 600 "$HOME/.config/ore-ai/.dev.vars"
```

Notes:

- If this file is missing, Codex environment setup will fail for new worktrees.
- Updating this shared file does not automatically update already-created worktrees; re-run setup or re-copy if needed.

Setup command run by Codex in each worktree:

```bash
cp "$HOME/.config/ore-ai/.dev.vars" .dev.vars
bun install
```

---

## Database

Wrangler handles all database connectivity. No credentials needed in config files.

```bash
# Regenerate Better Auth schema after changing auth plugins
bun run auth:generate

# Generate SQL migration files from schema changes
bun run db:generate

# Apply to local D1
bun run db:migrate:local

# Apply to production D1
bun run db:migrate:prod
```

---

## Commands

Type checking uses TypeScript Go (`tsgo`) via `@typescript/native-preview`. This compiler is currently in preview.

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Test
bun run test

# Build
bun run build

# Preview Cloudflare build locally
bun run preview

# Deploy to production
bun run deploy

# Upload build without deploying
bun run upload

# Regenerate Cloudflare env types
bun run cf-typegen
```

---

## Contributing

Open to ideas and collaboration. If you have something that fits, reach out. If you work on a product that could be a good fit for this project, reach out too. Whether you want a real-world test environment, have a cool idea, or just want to chat — always open to it.

---

The app may be mid-rebuild at any given moment. That's not a warning, just context.
