# Technology Stack

## Package Manager
- **Bun**

---

## Application

| Concern           | Technology              | Notes |
|-------------------|-------------------------|-------|
| Framework         | Next.js (App Router)    | Deployed via OpenNext adapter |
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
| Hosting        | Cloudflare |       |
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
| AI Evals          | TBD        | Dataset-driven evals for prompt/tool quality and regression detection |
| End-to-End        | TBD        | To be selected once critical user journeys are finalized |
| CI Test Execution | GitHub Actions | Executes required quality gates on PRs and `main` |

---