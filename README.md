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
| Framework | Next.js 16 (App Router) |
| Hosting | Cloudflare Workers via OpenNext |
| Database | Cloudflare D1 |
| ORM | Drizzle |
| Auth | Better Auth (Google OAuth) |
| UI | shadcn/ui, Tailwind CSS v4 |
| Linting | Biome |
| Package Manager | Bun |

---

## Getting Started

**Prerequisites**

- Bun installed
- Cloudflare account authenticated with Wrangler
- `.dev.vars` at the project root — copy from `.dev.vars.example` and fill in your secrets

```bash
bun install
bun dev
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