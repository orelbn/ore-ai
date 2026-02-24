---
name: using-git-worktrees
description: Use automatically before starting implementation after a plan has been approved. Triggers when a feature plan is finalized and the agent is ready to begin coding. Also triggers when the user says things like "start implementing", "let's build this", "go ahead", or "start the worktree". Creates an isolated git worktree so implementation happens on its own branch without touching the main workspace.
---

# Using Git Worktrees

## Overview

This skill runs at one specific moment: **after a plan is approved and before implementation begins**.

The agent plans the feature in the main workspace. Once the plan is agreed on, it creates an isolated worktree, sets it up, and continues the implementation there. The main workspace stays clean.

**Announce at start:** "Plan is approved — setting up an isolated workspace before we begin."

**Core workflow:** verify gitignore → create worktree → install deps → copy secrets → verify baseline → begin implementation.

---

## When to Use This

- A feature plan has been discussed and approved
- The agent is about to write code
- The work is substantial enough to warrant its own branch

Do not use for small one-file fixes where a branch is overkill. Use judgment.

---

## Step 1: Choose a Branch Name

Derive it from the feature being implemented. Keep it short and descriptive.

```
feature/sign-in-page
fix/session-cookie
chore/update-drizzle-schema
```

---

## Step 2: Verify .worktrees Is Gitignored

**Never skip this.**

```bash
git check-ignore -q .worktrees 2>/dev/null && echo "ignored" || echo "NOT ignored"
```

**If not ignored:**

```bash
echo ".worktrees/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .worktrees directory"
```

---

## Step 3: Create the Worktree

```bash
git worktree add .worktrees/BRANCH_NAME -b BRANCH_NAME
```

---

## Step 4: Project Setup

This project uses **Bun**. Never use npm or yarn.

```bash
cd .worktrees/BRANCH_NAME
bun install
```

Copy secrets — worktrees do not inherit `.dev.vars` from the root:

```bash
cp ../../.dev.vars .dev.vars
```

---

## Step 5: Verify Clean Baseline

```bash
bun run typecheck
```

If this fails — stop and report before doing anything else. Never implement on a broken baseline.

---

## Step 6: Report and Begin

```
Worktree ready at .worktrees/BRANCH_NAME
Branch: BRANCH_NAME
Typecheck: passing
.dev.vars: copied

Starting implementation now.
```

Then continue directly into the implementation without waiting for further instruction.

---

## Coordination Rules

| Rule | Why |
|---|---|
| Each worktree owns different files | Prevents merge conflicts |
| Never touch `db/schema/auth.ts` from a worktree if another is doing the same | Schema changes must be sequential |
| Never run `bun run db:migrate:local` from two worktrees at once | SQLite does not support concurrent writes |
| Never run `wrangler d1 migrations apply` from two worktrees at once | Same reason |

---

## Merging Back

When implementation is complete:

```bash
# From the main worktree
git diff main..BRANCH_NAME     # review changes
git merge BRANCH_NAME          # merge when satisfied
```

---

## Cleanup

```bash
# From the main worktree — never from inside the worktree being removed
git worktree remove .worktrees/BRANCH_NAME

# Force remove if uncommitted changes remain
git worktree remove --force .worktrees/BRANCH_NAME

# Delete the branch if no longer needed
git branch -d BRANCH_NAME

# Verify
git worktree list
```

---

## Common Mistakes

**Forgetting `.dev.vars`**
Wrangler won't inject secrets. Copy it every time.

**Running migrations from a worktree**
Always run DB migrations from the main worktree only.

**Skipping typecheck**
If the baseline is broken, any bugs introduced during implementation will be impossible to isolate.

**Leaving old worktrees around**
Each one is a full copy of the project. Clean up when done.

---

## Example

```
[Plan for sign-in page redesign approved]

Setting up isolated workspace before we begin.

[git check-ignore .worktrees — not ignored]
[Adding .worktrees/ to .gitignore and committing]
[git worktree add .worktrees/feature/sign-in-page -b feature/sign-in-page]
[bun install]
[cp ../../.dev.vars .dev.vars]
[bun run typecheck — passing]

Worktree ready at .worktrees/feature/sign-in-page
Branch: feature/sign-in-page
Typecheck: passing
.dev.vars: copied

Starting implementation now.
```