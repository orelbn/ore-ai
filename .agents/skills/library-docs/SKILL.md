---
name: library-docs
description: Fetch and understand documentation for a library or dependency before working with it. Use this skill whenever a library, package, or framework is mentioned that requires understanding its API, usage, or current version behavior.
---

# Library Documentation Skill

Before working with any library, dependency, or framework, follow this resolution order to get up-to-date documentation:

## Resolution Order

### 1. Check the llms.txt registry
Read [.agents/reference/libraries/registry.md](../../reference/libraries/registry.md) and look for the library name. If a URL is listed, use the `web/fetch` tool to view the documentation.

**Do not guess or construct llms.txt URLs.** Only use URLs explicitly listed in the registry.

### 2. Discover the llms.txt URL via Context7
If the library is not in the registry, use context7 to find the correct URL:
1. Call `resolve-library-id` with the library name
2. Check if the resolved library metadata includes a docs URL or `llms.txt` reference
3. If a `llms.txt` URL is found, fetch it to verify it returns valid content
4. If valid, **add the confirmed URL to the registry** before using it

### 3. Fall back to Context7 docs directly
If no `llms.txt` URL can be confirmed, use context7 docs directly:
1. Call `resolve-library-id` with the library name
2. Call `query-docs` with the resolved ID and your specific question

### 4. Ask the user
If none of the above yield sufficient documentation, ask the user to provide the correct `llms.txt` URL or a link to the relevant documentation, then add it to the registry.

## Notes
- Do not repeat this process for a library you already have context for in the current session.
- Always prefer the most specific documentation relevant to the version in use.
- When adding a new entry to the registry, always verify the URL returns valid content first.
