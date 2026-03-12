# Unit Test Contract Matrix

This document defines behavioral contracts, observable outcomes, failure meaning, and determinism controls for the `src` unit/integration test suite.

## API Handlers

### SUT
- `POST /api/chat` in `src/routes/api/chat.ts`
- `GET /api/chats` in `src/routes/api/chats.ts`
- `GET/DELETE /api/chats/$chatId` in `src/routes/api/chats/$chatId.ts`
- `GET/POST /api/auth/$` in `src/routes/api/auth/$.ts`

### Behavioral Contracts
- Unauthorized requests return `401` and do not execute protected downstream logic.
- Validation and ownership failures map to stable HTTP responses.
- Successful requests return expected status/payload and invoke repository/stream boundaries correctly.
- Unexpected failures return `500` and emit structured route error + API log events.

### Observable Outcomes
- HTTP status/body.
- Calls to mocked dependencies (`streamAssistantReply`, repository operations, auth handler).
- Logged event payload shape (`logChatApiEvent`) and error reporting (`reportChatRouteError`).

### Failure Meaning
- Handler behavior regressed (auth, validation, ownership, success path, or failure telemetry).

### Case Matrix
| Case type | Rule verified | Input shape | Expected observable outcome | Why it matters |
|---|---|---|---|---|
| Happy path | Valid authenticated request succeeds | valid request and ownership | `200`/`204` and downstream call args | Core product behavior |
| Boundary | Known non-happy path statuses | unauthenticated/rate-limited/invalid ID | `401`/`429`/`400`/`403`/`404` | Stable API contract |
| Adversarial | Unexpected runtime error is contained | dependency throws | `500`, error report, log event | Production resilience |

### Determinism Plan
- Mock all route-step/repository/stream/auth boundaries.
- Stub UUID/time as needed.
- Assert side effects via in-memory state arrays.

## Route Steps and Validation Pipeline

### SUT
- `src/modules/chat/logic/route-steps.ts`

### Behavioral Contracts
- Auth extraction returns user id or `null`.
- Rate-limit branch returns either `{ ok: true, ipHash }` or `{ ok: false, response }`.
- Ownership checks map correctly for missing/forbidden/owned sessions.
- Chat request errors map `413` specially and other statuses generically.

### Observable Outcomes
- Returned union shape and response status/body.
- Correct calls to auth/rate-limit/security/repository helpers.

### Failure Meaning
- Route orchestration logic has broken request gating.

### Case Matrix
| Case type | Rule verified | Input shape | Expected observable outcome | Why it matters |
|---|---|---|---|---|
| Happy path | Auth + allowed rate + valid ownership | valid request context | success union payloads | Main orchestration path |
| Boundary | Missing owner with allowMissing | unknown chat id | `hasExistingSession=false` | New chat creation support |
| Adversarial | Rate limited / ownership mismatch | mocked limited owner mismatch | `429` / `403` responses | Abuse and tenant isolation |

### Determinism Plan
- Mock `verifySessionFromRequest`, `checkChatRateLimit`, `getClientIp`, `hashIpAddress`, `getChatSessionOwner`.
- Use deterministic request headers and static values.

## Runtime Config and Prompt Storage

### SUT
- `src/modules/chat/logic/runtime-config.ts`
- `src/modules/chat/logic/prompt-storage.ts`
- `src/modules/chat/logic/prompt-storage-r2.ts`

### Behavioral Contracts
- Runtime env parsing requires valid `MCP_SERVER_URL`.
- Optional prompt key resolves via R2 prompt storage and trims values.
- Prompt storage failures downgrade to warning and no override prompt.
- Empty/missing prompt values fail fast in storage layer.

### Observable Outcomes
- Returned config object.
- Thrown errors for invalid env/storage data.
- Warning payload emission.

### Failure Meaning
- Runtime bootstrap behavior or prompt fallback safety regressed.

### Case Matrix
| Case type | Rule verified | Input shape | Expected observable outcome | Why it matters |
|---|---|---|---|---|
| Happy path | Valid env and prompt lookup | URL + prompt key + bucket text | prompt override returned | Runtime prompt control |
| Boundary | Empty/whitespace key | AGENT_PROMPT_KEY whitespace | treated as undefined | Robust env handling |
| Adversarial | Invalid URL/missing bucket/empty prompt | malformed env | throw or warn+fallback | Safe failure behavior |

### Determinism Plan
- Use plain object env and fake bucket.
- Capture `console.warn` with mock function.

## Chat Domain Modules

### SUT
- `assistant-message-selection`, `persisted-message-id`, `content`, `client`, `repository`, `assistant-stream`, `rate-limit`, `security`, `cloudflare`, `logging`, `error-reporting`

### Behavioral Contracts
- Message selection only persists assistant messages for current turn.
- Persisted id logic preserves explicit ids and generates deterministic prefix for generated ids.
- Content utilities filter non-text parts and enforce truncation/fallback rules.
- Client functions parse success payloads and map error payloads robustly.
- Repository maps DB rows to UI messages and persists chat/session updates correctly.
- Assistant stream orchestrates session creation, validation, persistence, MCP lifecycle, and finish/error behavior.
- Rate limiting enforces user/ip thresholds.
- Security/cloudflare/logging/reporting helpers extract and emit expected metadata.

### Observable Outcomes
- Returned DTOs, selected messages, hashed strings.
- Calls to DB/query boundaries and stream orchestration boundaries.
- Logged JSON payload fields.

### Failure Meaning
- Core chat runtime behavior or persistence/observability semantics regressed.

### Case Matrix
| Case type | Rule verified | Input shape | Expected observable outcome | Why it matters |
|---|---|---|---|---|
| Happy path | End-to-end orchestration across helper boundaries | valid message/session/tool setup | expected response + persistence calls | Core chat flow |
| Boundary | Fallback indexes, empty parts, missing prior session | mixed message arrays / no owner | safe defaults and no invalid persistence | Data safety |
| Adversarial | Invalid JSON, query/storage errors, onFinish append failure | malformed rows / thrown errors | fallback output + error report + close behavior | Reliability |

### Determinism Plan
- Mock DB query layer, AI SDK boundaries, MCP tool resolver, and console output.
- Stub `Date.now` and `crypto.randomUUID` where values are asserted.
- No external network/model calls in tests.

## Auth and Route Guards

### SUT
- `src/services/better-auth/server.ts`
- `src/routes/route-protection.test.ts` (route guard behavior)
- `src/services/better-auth/local-test-auth.ts`

### Behavioral Contracts
- Session extraction returns `null` for missing/invalid payload and returns full session when valid.
- Protected route redirects unauthenticated users and allows authenticated users.
- Sign-in route redirects authenticated users away.
- Local test auth only enables on localhost and explicit env flag.

### Observable Outcomes
- Returned session/user values.
- Redirect status + route target metadata.
- Local auth config object/undefined.

### Failure Meaning
- Authentication/authorization guard behavior regressed.

### Determinism Plan
- Mock Better Auth and auth server wrappers.
- Use fixed request headers and env vars.

## Utilities and UI Helpers

### SUT
- `src/lib/try-catch.ts`
- `src/lib/utils.ts`
- `src/modules/auth/logic/sign-in-errors.ts`
- `src/modules/chat/logic/workspace-utils.ts`

### Behavioral Contracts
- `tryCatch` returns discriminated success/failure result.
- `cn` merges classes with Tailwind conflict resolution.
- Sign-in errors pick best available message fallback.
- Workspace helpers produce stable title/preview/text formatting semantics.

### Observable Outcomes
- Returned values and message strings.

### Failure Meaning
- Low-level UX/data helper behavior regressed and can propagate broad UI defects.

### Determinism Plan
- Pure function tests with fixed inputs.
- Avoid locale-fragile exact timestamp string assertions; assert stable shape.

## Out Of Scope
- `evals/tests` model behavior tests.
- E2E/browser tests.
- DOM-rendered component tests.
