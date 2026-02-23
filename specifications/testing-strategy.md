# Testing Strategy

## Goals
- Keep feedback loops fast during development.
- Catch regressions before merge and before deployment.
- Start lean and increase rigor as product complexity grows.

---

## Test Levels

| Level | Scope | Tooling | When to run |
|-------|-------|---------|-------------|
| Unit | Pure functions, utilities, data transforms | Bun test runner (`bun test`) | Local development + CI |
| Integration | Route handlers, server actions, component integration points | Bun test runner (`bun test`) | Local development + CI |
| Evals | Prompt quality, tool-use correctness, response quality/safety, regression against golden datasets | TBD | CI + pre-release |
| End-to-End | Critical user journeys across app routes | TBD | CI (required before production release) |

---

## Repository Conventions
- Place tests next to implementation files when practical using `*.test.ts` / `*.test.tsx`.
- Keep tests deterministic (no external network calls unless explicitly mocked).
- Prefer testing behavior and outcomes over implementation details.
- Maintain versioned eval datasets (inputs + expected outcomes/rubrics) for critical AI flows.

---

## CI Quality Gates
- Run on every pull request and on `main`.
- Required checks:
  - Type checking
  - Linting
  - Unit/Integration tests
  - Evals suite (critical AI flows)
  - Build verification

---

## Evolution Plan
- Phase 1: Establish stable unit and integration coverage for core logic.
- Phase 2: Add baseline evals for high-impact prompts, tools, and safety constraints.
- Phase 3: Add end-to-end coverage for top critical flows.
- Phase 4: Add explicit coverage and eval pass-rate thresholds once baseline suites are stable.