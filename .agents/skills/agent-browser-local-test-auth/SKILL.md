---
name: agent-browser-local-test-auth
description: Authenticate agent-browser against this repo's local app without Google OAuth by using the local test auth flow. Use when browser automation needs an authenticated session on localhost (for example testing protected routes, chat UI, or authenticated flows) and social login is blocked by anti-bot protections.
---

# Local Test Auth For agent-browser

Use this workflow to create an authenticated `agent-browser` session for local development.

## Prerequisites

- Run from the project root.
- Keep `LOCAL_TEST_AUTH_ENABLED=false` by default.
- Enable local test auth only for active test runs:
  - Set `LOCAL_TEST_AUTH_ENABLED=true` in `.dev.vars` or shell env.
- Start dev server (`bun dev`).

## Primary command

Run:

```bash
scripts/test-auth-agent-browser.sh http://localhost:3000 my-session
```

Arguments:

- First argument: base URL (default `http://localhost:3000`)
- Second argument: `agent-browser` session name (default `ore-test-auth`)

The script:

1. Best-effort sign-up of the fixed test user.
2. Sign-in via Better Auth email/password endpoints.
3. Extract `better-auth.session_token` from cookie jar.
4. Inject cookie into `agent-browser` session.
5. Open `/` authenticated.

## Optional overrides

Set these env vars before running the script to change test user identity:

```bash
TEST_AUTH_EMAIL=agent-browser-test@localhost.localdomain
TEST_AUTH_PASSWORD=agent-browser-test-password
TEST_AUTH_NAME="Agent Browser Test User"
```

## Verify auth state

After script finishes, verify the browser is authenticated:

```bash
agent-browser --session my-session get url
agent-browser --session my-session snapshot -i
```

Expect app-shell authenticated UI, not `/sign-in`.

## Disable after testing

- Reset `LOCAL_TEST_AUTH_ENABLED=false`.
- Stop local dev server if no longer needed.

## Troubleshooting

- If sign-in fails with `401/403`:
  - Confirm `LOCAL_TEST_AUTH_ENABLED=true` for the running dev process.
  - Confirm app is running at the URL passed to the script.
- If session is not authenticated after script:
  - Re-run script with a fresh session name.
  - Ensure `agent-browser` can write cookies in the active session.
