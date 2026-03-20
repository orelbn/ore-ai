import { beforeEach, describe, expect, test, vi } from "vitest";
import { resolveChatSessionAccess } from "./chat-access";

const state = vi.hoisted<{
	hasSessionAccess: boolean;
	sessionBindingId: string | null;
	verifyCalls: number;
	verifiedToken: boolean;
	rateLimitCalls: Array<"session_verify" | "chat">;
	rateLimitResponse: Response | null;
	getSessionCalls: number;
	getSessionResult: { session: { id: string } } | null;
	signInAnonymousCalls: number;
	signInAnonymousSetCookies: string[];
	createdBindingId: string | undefined;
}>(() => ({
	hasSessionAccess: false,
	sessionBindingId: null,
	verifyCalls: 0,
	verifiedToken: true,
	rateLimitCalls: [],
	rateLimitResponse: null,
	getSessionCalls: 0,
	getSessionResult: null,
	signInAnonymousCalls: 0,
	signInAnonymousSetCookies: ["ore_ai.session=anon"],
	createdBindingId: undefined,
}));

vi.mock("./session-access-cookie", () => ({
	hasValidSessionAccessCookie: async () => state.hasSessionAccess,
	getSessionAccessBindingId: async () => state.sessionBindingId,
	createSessionAccessCookie: async (_secret: string, bindingId?: string) => {
		state.createdBindingId = bindingId;
		return `ore_ai_session=${bindingId ?? "missing"}`;
	},
}));

vi.mock("@/services/cloudflare", () => ({
	verifyTurnstileToken: async () => {
		state.verifyCalls += 1;
		return state.verifiedToken;
	},
}));

vi.mock("@/services/auth", () => ({
	auth: {
		api: {
			getSession: async () => {
				state.getSessionCalls += 1;
				return state.getSessionResult;
			},
			signInAnonymous: async () => {
				state.signInAnonymousCalls += 1;
				return {
					headers: {
						getSetCookie: () => state.signInAnonymousSetCookies,
					} as Headers,
				};
			},
		},
	},
}));

vi.mock("@/lib/security/rate-limit", () => ({
	applyAnonymousRateLimit: async ({
		scope,
	}: {
		scope: "session_verify" | "chat";
	}) => {
		state.rateLimitCalls.push(scope);
		return state.rateLimitResponse;
	},
}));

beforeEach(() => {
	state.hasSessionAccess = false;
	state.sessionBindingId = null;
	state.verifyCalls = 0;
	state.verifiedToken = true;
	state.rateLimitCalls = [];
	state.rateLimitResponse = null;
	state.getSessionCalls = 0;
	state.getSessionResult = null;
	state.signInAnonymousCalls = 0;
	state.signInAnonymousSetCookies = ["ore_ai.session=anon"];
	state.createdBindingId = undefined;
});

function createSameOriginChatRequest(body?: Record<string, unknown>) {
	return new Request("https://oreai.orelbn.ca/api/chat", {
		method: "POST",
		headers: {
			origin: "https://oreai.orelbn.ca",
			"sec-fetch-site": "same-origin",
		},
		body: body ? JSON.stringify(body) : undefined,
	});
}

describe("resolveChatSessionAccess", () => {
	test("should reject cross-site post requests before session checks run", async () => {
		const result = await resolveChatSessionAccess({
			request: new Request("https://oreai.orelbn.ca/api/chat", {
				method: "POST",
				headers: {
					origin: "https://attacker.example",
					"sec-fetch-site": "cross-site",
				},
			}),
			env: {
				SESSION_ACCESS_SECRET: "session-secret",
				TURNSTILE_SECRET_KEY: "turnstile-secret",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected a blocked response");
		}
		expect(result.response.status).toBe(403);
		await expect(result.response.json()).resolves.toEqual({
			error: "Invalid request.",
		});
		expect(state.verifyCalls).toBe(0);
		expect(state.signInAnonymousCalls).toBe(0);
		expect(state.getSessionCalls).toBe(0);
		expect(state.createdBindingId).toBeUndefined();
	});

	test("should create an anonymous auth session and session-access cookie on first send", async () => {
		state.signInAnonymousSetCookies = [
			"ore_ai.session=anon",
			"ore_ai.cache=warm",
		];

		const result = await resolveChatSessionAccess({
			request: createSameOriginChatRequest({
				conversationId: "conversation-1",
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
				],
				turnstileToken: "token-1",
			}),
			env: {
				SESSION_ACCESS_SECRET: "session-secret",
				TURNSTILE_SECRET_KEY: "turnstile-secret",
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error("Expected an allowed response");
		}
		expect(result.sessionBindingId).toBeTruthy();
		expect(result.responseHeaders.getSetCookie()).toEqual([
			"ore_ai.session=anon",
			"ore_ai.cache=warm",
			`ore_ai_session=${result.sessionBindingId}`,
		]);
		expect(state.createdBindingId).toBe(result.sessionBindingId);
		expect(state.rateLimitCalls).toEqual(["session_verify", "chat"]);
		expect(state.verifyCalls).toBe(1);
		expect(state.signInAnonymousCalls).toBe(1);
		expect(state.getSessionCalls).toBe(1);
	});

	test("should reject missing turnstile tokens when there is no access cookie", async () => {
		const result = await resolveChatSessionAccess({
			request: createSameOriginChatRequest({
				conversationId: "conversation-1",
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
				],
			}),
			env: {
				SESSION_ACCESS_SECRET: "session-secret",
				TURNSTILE_SECRET_KEY: "turnstile-secret",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected a blocked response");
		}
		expect(result.response.status).toBe(401);
		await expect(result.response.json()).resolves.toEqual({
			error: "Session access required.",
		});
		expect(state.rateLimitCalls).toEqual(["session_verify"]);
		expect(state.verifyCalls).toBe(0);
		expect(state.signInAnonymousCalls).toBe(0);
		expect(state.getSessionCalls).toBe(0);
		expect(state.createdBindingId).toBeUndefined();
	});

	test("should reject verification when Turnstile validation fails", async () => {
		state.verifiedToken = false;

		const result = await resolveChatSessionAccess({
			request: createSameOriginChatRequest({
				conversationId: "conversation-1",
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
				],
				turnstileToken: "token-1",
			}),
			env: {
				SESSION_ACCESS_SECRET: "session-secret",
				TURNSTILE_SECRET_KEY: "turnstile-secret",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected a blocked response");
		}
		expect(result.response.status).toBe(403);
		await expect(result.response.json()).resolves.toEqual({
			error: "Session verification failed.",
		});
		expect(state.rateLimitCalls).toEqual(["session_verify"]);
		expect(state.verifyCalls).toBe(1);
		expect(state.signInAnonymousCalls).toBe(0);
		expect(state.getSessionCalls).toBe(0);
		expect(state.createdBindingId).toBeUndefined();
	});
});
