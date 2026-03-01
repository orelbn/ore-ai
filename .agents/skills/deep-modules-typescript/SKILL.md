---
name: deep-modules-typescript
description: Architecture guidance for structuring TypeScript codebases using deep modules - simple public interfaces hiding substantial internal complexity. Use this skill whenever the user asks about TypeScript project structure, module boundaries, monorepo organization, refactoring for maintainability, or AI-agent-friendly codebases. Also trigger when the user mentions problems like "too many files to change at once", "hard to know what to import", "leaking implementation details", or wants to make a codebase easier for AI agents to work with.
---

# Deep Modules Architecture (TypeScript)

This skill helps structure TypeScript codebases so each module has a small public interface hiding large internal complexity. Keep most changes inside one module without rippling outward.

## Core Concepts

- **Deep module**: small/stable public API + substantial hidden internal work (orchestration, retries, caching, validation, mapping, error handling).
- **Shallow module**: interface almost as complex as implementation - thin wrappers, pass-throughs, classitis. Avoid these.
- **Information hiding**: each module owns one design decision (storage, auth, billing, search) and hides it from callers.
- **Information leakage**: callers depend on details that should stay internal, including back-door coupling not visible in types.
- **Temporal decomposition smell**: structuring modules around execution steps (`parse -> validate -> transform -> persist`) instead of the decision being hidden. This causes leakage.

## Standard Layout

```text
src/modules/<name>/
  index.ts        <- ONLY public entrypoint; export nothing else
  README.md       <- module contract
  internal/       <- never imported from outside
  test/           <- contract tests (black-box against public API only)
```

For monorepos, promote each module to a workspace package so Node's `exports` field physically prevents deep imports.

## Non-Negotiable Rules

1. Keep the public API small. Add exports only when they materially simplify common caller usage.
2. Block deep imports. Nothing outside the module touches `internal/` or non-exported files.
3. Move complexity downward. Make module authors do the hard work so callers do not have to.
4. Own one clear design decision. If it cannot be named, the boundary is wrong.
5. Validate every change. Ensure contract tests pass before and after.

## Skill: Carve A New Deep Module Boundary

Use this when leakage, duplicated logic, or call-site rituals appear.

1. Name the design decision the module hides (for example, how sessions are stored or how a payment provider is called).
2. Find where it leaks now: repeated logic, duplicated constants, scattered try/catch, caller-enforced ordering.
3. Draft the contract in `README.md` before writing code:
   - Define what it does and does not do.
   - Specify public API function signatures and types.
   - Declare invariants and guarantees.
   - Define error semantics and required caller behavior.
   - Provide one or two usage examples.
4. Implement internals only after the contract is agreed.
5. Migrate at least two call-sites. If caller code does not get simpler, the boundary is wrong.

Definition of done: at least two call-sites migrated, caller code simpler, public API minimal/stable, contract tests exist and pass.

## Skill: Shape A Good Interface

- Optimize for the most common caller path; do not complicate defaults for rare features.
- Eliminate call-order constraints; have the module do the right thing automatically.
- Prefer one high-level operation over many tiny steps. `saveUserProfile(profile)` is better than repeated manual `validate -> normalize -> write -> invalidateCache`.
- Use TypeScript to encode invariants: branded IDs, discriminated unions, `readonly`, `#private`, narrow return types.
- If `A.method()` only forwards to `B.method()` with the same shape, there is no real abstraction.

Error handling:

- Use typed results for expected runtime failures:
  `{ ok: true; value: T } | { ok: false; error: E }`.
- Surface errors at the module's abstraction level; do not leak low-level library errors.

## Skill: Enforce Boundaries Mechanically

### Monorepo (Recommended For Large Codebases)

Make each module a workspace package and use `exports` to prevent deep imports.

```jsonc
// packages/<name>/package.json
{
  "name": "@acme/<name>",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

Callers can only import from the package root.

### Single-Package Repo

Add an ESLint rule to block internal imports.

```js
// eslint.config.js (snippet)
rules: {
  "no-restricted-imports": ["error", {
    patterns: [{
      group: ["**/modules/*/internal/**"],
      message: "Import from the module's index.ts, not its internals."
    }]
  }]
}
```

### TypeScript Project References

When build times or type-checking discipline matter, make each module a composite project.

```jsonc
// packages/<name>/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "composite": true, "declaration": true, "outDir": "dist" },
  "include": ["src/**/*.ts"],
  "references": [{ "path": "../<dependency>" }]
}
```

Root `tsconfig.json`:

```jsonc
{ "files": [], "references": [{ "path": "./packages/<a>" }, { "path": "./packages/<b>" }] }
```

This creates a hard `.d.ts` boundary that reinforces interface discipline and enables incremental builds.

## Skill: Write Contract Tests

Target the public API only; keep tests black-box whenever possible. If a test must import from `internal/` for setup, the interface is incomplete.

- Add a failing test first, then implement until it passes.
- Validate caller-visible behavior in contract tests. Keep internal tests optional and secondary.
- Put integration tests behind fakes or test containers. Do not couple them to internal structure.

## Skill: AI-Safe Refactoring Workflow

When migrating existing code to a deep module:

1. Create `index.ts`, `README.md` contract, and `internal/` skeleton.
2. Write contract tests for desired behavior (tests should fail first).
3. Move code inward while preserving current public behavior. Add thin adapters at old call-sites to migrate incrementally.
4. Migrate call-sites in small batches; run tests after each batch.
5. Delete old paths only after all call-sites use the module.
6. Tighten boundaries (`exports`, ESLint restrictions) last.

Order matters: define contract and tests first, then migrate incrementally to keep the system stable.

## Red Flags - Stop And Redesign

- The README cannot clearly name which design decision the module hides.
- Public API keeps growing to expose internal steps.
- Callers still need ritual sequences ("call A, then B, then C").
- Many files exist but mostly tiny pass-through wrappers.
- Tests require importing `internal/` for setup.
- Changing implementation details forces caller updates.
