import { beforeEach, describe, expect, test, vi } from "vitest";
import { SESSION_RESET_RESPONSE_HEADER } from "../constants";
import { resolveChatSessionAccess } from "./chat-access";

const state = vi.hoisted<{
	verifyCalls: number;
	verifiedToken: boolean;
	rateLimitCalls: Array<"session_verify" | "chat">;
	rateLimitResponse: Response | null;
	getSessionCalls: number;
	getSessionResult: { session: { id: string } } | null;
	signInAnonymousCalls: number;
	signInAnonymousSetCookies: string[];
}>(() => ({
	verifyCalls: 0,
	verifiedToken: true,
	rateLimitCalls: [],
	rateLimitResponse: null,
	getSessionCalls: 0,
	getSessionResult: null,
	signInAnonymousCalls: 0,
	signInAnonymousSetCookies: ["ore_ai.session=anon"],
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
	state.verifyCalls = 0;
	state.verifiedToken = true;
	state.rateLimitCalls = [];
	state.rateLimitResponse = null;
	state.getSessionCalls = 0;
	state.getSessionResult = null;
	state.signInAnonymousCalls = 0;
	state.signInAnonymousSetCookies = ["ore_ai.session=anon"];
});

function createSameOriginChatRequest(
	body?: Record<string, unknown>,
	headers?: HeadersInit,
) {
	return new Request("https://oreai.orelbn.ca/api/chat", {
		method: "POST",
		headers: {
			origin: "https://oreai.orelbn.ca",
			"sec-fetch-site": "same-origin",
			...headers,
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
		if (result.ok) throw new Error("Expected a blocked response");
		expect(result.response.status).toBe(403);
		await expect(result.response.json()).resolves.toEqual({
			error: "Invalid request.",
		});
		expect(state.getSessionCalls).toBe(0);
		expect(state.verifyCalls).toBe(0);
		expect(state.signInAnonymousCalls).toBe(0);
	});

	test("should allow chat immediately when the auth session is still active", async () => {
		state.getSessionResult = { session: { id: "session-1" } };

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

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("Expected an allowed response");
		expect(result.responseHeaders.getSetCookie()).toEqual([]);
		expect(state.rateLimitCalls).toEqual(["chat"]);
		expect(state.verifyCalls).toBe(0);
		expect(state.signInAnonymousCalls).toBe(0);
	});

	test("should create an anonymous auth session on first send after Turnstile succeeds", async () => {
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
		if (!result.ok) throw new Error("Expected an allowed response");
		expect(result.responseHeaders.getSetCookie()).toEqual([
			"ore_ai.session=anon",
			"ore_ai.cache=warm",
		]);
		expect(state.rateLimitCalls).toEqual(["session_verify", "chat"]);
		expect(state.verifyCalls).toBe(1);
		expect(state.signInAnonymousCalls).toBe(1);
		expect(state.getSessionCalls).toBe(1);
	});

	test("should reject missing turnstile tokens when there is no active auth session", async () => {
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
		if (result.ok) throw new Error("Expected a blocked response");
		expect(result.response.status).toBe(401);
		await expect(result.response.json()).resolves.toEqual({
			error: "Session access required.",
		});
		expect(
			result.response.headers.get(SESSION_RESET_RESPONSE_HEADER),
		).toBeNull();
		expect(state.rateLimitCalls).toEqual(["session_verify"]);
		expect(state.verifyCalls).toBe(0);
		expect(state.signInAnonymousCalls).toBe(0);
	});

	test("should request a fresh start when the client expected an active session but auth is unusable", async () => {
		const result = await resolveChatSessionAccess({
			request: createSameOriginChatRequest(
				{
					conversationId: "conversation-1",
					messages: [
						{
							id: "user-1",
							role: "user",
							parts: [{ type: "text", text: "hello" }],
						},
					],
				},
				{ "x-ore-active-session": "true" },
			),
			env: {
				SESSION_ACCESS_SECRET: "session-secret",
				TURNSTILE_SECRET_KEY: "turnstile-secret",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("Expected a blocked response");
		expect(result.response.status).toBe(401);
		expect(result.response.headers.get(SESSION_RESET_RESPONSE_HEADER)).toBe(
			"true",
		);
		await expect(result.response.json()).resolves.toEqual({
			error:
				"We couldn't keep your chat session active. Restarting chat is required.",
		});
		expect(state.rateLimitCalls).toEqual([]);
		expect(state.verifyCalls).toBe(0);
		expect(state.signInAnonymousCalls).toBe(0);
	});
});
