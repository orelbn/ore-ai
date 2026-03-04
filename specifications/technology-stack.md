# Technology Stack

## Package Manager
- **Bun**

---

## Application

| Concern           | Technology              | Notes |
|-------------------|-------------------------|-------|
| Framework         | TanStack Start (React)  | File-based routing + server routes via Vite plugin |
| Routing           | TanStack Router         | Auth guards use `beforeLoad` in `src/app/_authenticated.tsx` |
| Language          | TypeScript (latest stable) | |
| Styling           | Tailwind CSS            | via shadcn/ui |
| Component Library | shadcn/ui (base-nova)   | With Base UI primitives |
| Icons             | Hugeicons               | via shadcn iconLibrary config |
| AI SDK            | Vercel AI SDK           | For agent/AI features |
| Authentication    | Better Auth             | Framework-agnostic TypeScript auth with extensible plugins |

---

## Database

| Concern        | Technology | Notes |
|----------------|------------|-------|
| Primary DB     | Cloudflare D1 | For relational app data and AI/session persistence |
| ORM            | Drizzle ORM | Type-safe schema and queries for D1 |
| Session Coordination | Durable Objects (when needed) | Add for stricter real-time ordering/coordination requirements |

---

## Infrastructure

| Concern        | Technology | Notes |
|----------------|------------|-------|
| Hosting        | Cloudflare Workers | TanStack Start server entry via Wrangler |
| CI/CD          | GitHub     |       |

---

## Code Quality

| Concern    | Technology | Notes |
|------------|------------|-------|
| Linting    | Biome      | Configured via `biome.json` |
| Formatting | Biome      | Configured via `biome.json` |

---

## Testing

| Concern           | Technology | Notes |
|-------------------|------------|-------|
| Unit/Integration  | Bun test   | Built-in test runner for fast feedback loops |
| AI Evals          | Node.js test runner style harness (`node:test`) | Evals are structured with `describe`/`test` semantics under `evals/tests`, run against the real model, and include deterministic assertions plus model-as-judge checks |
| End-to-End        | TBD        | To be selected once critical user journeys are finalized |
| CI Test Execution | GitHub Actions | Executes required quality gates on PRs and `main` |

### Node Test Runner Reference
- The eval architecture follows the Node.js test runner model (`node:test`) so suites read like unit/integration tests while executing real model calls.
- Test files live in `evals/tests/` and setup/helpers live in `evals/` (for example env config, model binding, judge utilities).
- Local command: `bun run evals`.
- `bun run test` is scoped to `src/` and does not execute eval suites.
- This separation keeps product tests fast and deterministic while allowing prompt-quality checks to evolve independently.

---
