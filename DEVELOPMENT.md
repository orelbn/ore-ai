# Development Guide

## Local Setup

Prerequisites:

- Bun
- A Cloudflare account authenticated with Wrangler
- A local `wrangler.jsonc` copied from `wrangler.jsonc.example`
- A local `.dev.vars` copied from `.dev.vars.example`

```bash
bun install
cp wrangler.jsonc.example wrangler.jsonc
cp .dev.vars.example .dev.vars
bun dev
```

Then fill in the placeholders in `wrangler.jsonc` and `.dev.vars`.

Most required values are already discoverable in:

- `.dev.vars.example`
- `wrangler.jsonc.example`
- `package.json`

Apply D1 migrations after you configure your local database binding:

```bash
bunx wrangler d1 migrations apply DB --local
```

## Runtime Notes

- The app is public by default. There is no sign-in flow and no server-side chat history.
- The current tab's conversation is stored in browser `sessionStorage`.
- Request context is trimmed by serialized size rather than raw message count.
- The first send requires Turnstile verification unless the browser already has a Better Auth anonymous session.

## Repo-Specific Config

- `AGENT_PROMPT_KEY` is optional. If set, the app loads `AGENT_PROMPTS/<key>` from R2; otherwise it falls back to the built-in prompt.
- `MCP_SERVER_URL` is optional and only needed if you want to target a local MCP server instead of the default service binding.

Example local MCP override:

```bash
MCP_SERVER_URL=http://localhost:8787/mcp
```

## Prompt Uploads

Prompt files live in `.prompts/`.

```bash
bun run prompt:upload -- --bucket your-agent-prompts-bucket-name
```

You can also pass `--source <file-or-folder>`. The script uploads markdown files to `prompts/*` in the target bucket.
