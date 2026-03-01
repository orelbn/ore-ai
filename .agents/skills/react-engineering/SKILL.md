---
name: react-engineering
description: General React engineering skill for building and refactoring React code in this repository. Use this whenever tasks involve React components, hooks, state management, effects, rendering performance, UI composition, client/server boundaries, or React architecture decisions—even if the user does not explicitly mention "React best practices."
---

# React Engineering Skill

This skill defines the default approach for writing maintainable React code in this repository.

## When to use this skill

Use this skill for any request that includes:

- Creating or editing React components (`.tsx`)
- Building or refactoring custom hooks
- State ownership and state flow decisions
- Component decomposition and file organization
- Effect/event handler logic
- Rendering/performance concerns
- UI structure migrations to existing design-system primitives

## Primary goals

- Keep components easy to read top-to-bottom
- Keep hooks focused on one concern
- Make state ownership explicit and minimal
- Prefer composition over monolithic containers
- Preserve behavior while refactoring structure

## Core React rules

### 1) Keep components shallow and composable

- Extract local subcomponents when JSX gets deeply nested.
- Prefer clear, domain names (`UserMenu`, `WorkspaceHeader`) over action names (`DoXControl`).
- Avoid large "god components" that own unrelated concerns.

### 2) Keep hooks single-purpose

- Create focused hooks by concern (data fetching, UI toggles, actions, routing glue).
- Use one cross-cutting hook only when behavior truly depends on multiple hooks.
- Avoid aggregate hooks that simply re-export many internal hook values.

### 3) State ownership rules

- Place state in the closest common owner that actually needs it.
- Do not duplicate the same source of truth in multiple hooks/components.
- Expose intentful actions (`open`, `close`, `toggle`) instead of raw setters when possible.

### 4) Effects and async behavior

- Use effects only for synchronization with external systems.
- Keep effect dependencies correct and stable.
- Handle async errors explicitly and surface user-friendly errors.
- Prevent duplicate submissions/actions for destructive or remote operations.

### 5) Events and handlers

- Keep event handlers short and intention-revealing.
- Move non-trivial logic into focused hooks/helper functions.
- Avoid inline logic blocks that mix UI and orchestration.

## Refactor workflow

1. Identify concerns in current component/hook.
2. Split by concern while keeping behavior unchanged.
3. Update call sites incrementally.
4. Remove obsolete wrappers/files.
5. Run typecheck/tests and fix introduced issues.

## UI primitives policy

- Prefer existing repository primitives from `src/components/ui`.
- Avoid rebuilding interaction mechanics already handled by primitives.
- Keep styling minimal and consistent with current design system.

## React + routing conventions

- For internal app navigation, use routing APIs (not manual `window.location.href`) unless full reload is intentional.
- Keep route/query coupling explicit; do not add URL state by default unless requested.

## Naming and file structure

- Components: domain-focused names (`SessionSidebar`, `ConversationPane`).
- Hooks: concern-focused names (`useWorkspaceSessionCatalog`).
- Keep related hooks together under a `hooks/` folder near the feature.

## Anti-patterns to avoid

- Monolithic state hooks returning large nested objects by default
- Components that fetch data, orchestrate many workflows, and render complex UI all in one file
- Repeated custom event plumbing where UI primitives already solve it
- Hidden state coupling via implicit URL/query syncing

## Definition of done

A React change is complete when:

- concerns are clearly separated
- files are easier to scan than before
- behavior is preserved (unless user requested change)
- stale abstraction layers are removed