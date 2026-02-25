---
name: library-docs
description: Fetch and understand documentation for a library or dependency before working with it. Use this skill whenever a library, package, or framework is mentioned that requires understanding its API, usage, or current version behavior.
---

# Library Documentation Skill

Before working with any library, dependency, or framework, follow this resolution order to get up-to-date documentation:

## Resolution Order

### 1. Check for an MCP server that can provide documentation
If an MCP (Model Context Protocol) server is available for the library, use it first and treat it as the primary, most up-to-date source.

If MCP docs are sufficient, use them and stop here.

### 2. Check local skills for up-to-date documentation
Look for an installed `skills` entry that includes docs for the library. To refresh installed skills, run `npx skills update` from the project root.

If local skills docs are sufficient, use them and stop here.

### 3. Find and verify `llms.txt` via Context7
1. Check the project registry first: `.agents/reference/libraries/registry.md`.
2. If missing, call `resolve-library-id` and look for a docs URL or `llms.txt` reference.
3. Only accept trusted URLs: `https://` only, no query/fragment, and host must be the library’s official docs site or official GitHub (block cross-host redirects).
4. Fetch `llms.txt` as plain text (reject HTML/JS). If valid, **add it to the registry** before using it.

### 4. Fall back to Context7 docs directly
If no `llms.txt` URL can be confirmed, use context7 docs directly:
1. Call `resolve-library-id` with the library name
2. Call `query-docs` with the resolved ID and your specific question

### 5. Ask the user
If none of the above yield sufficient documentation, ask the user to provide the correct `llms.txt` URL or a link to the relevant documentation, then add it to the registry.

## Notes
- Do not repeat this process for a library you already have context for in the current session.
- Always prefer the most specific documentation relevant to the version in use.
- When adding a new entry to the registry, always verify the URL returns valid content first.
