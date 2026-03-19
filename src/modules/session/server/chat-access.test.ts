import { beforeEach, describe, expect, test, vi } from "vitest";
import { resolveChatSessionAccess } from "./chat-access";

const state = vi.hoisted<{
	sessionCalls: number;
	rateLimitCalls: number;
	session: {
		session: {
			id: string;
		};
	} | null;
	rateLimitResponse: Response | null;
}>(() => ({
	sessionCalls: 0,
	rateLimitCalls: 0,
	session: {
		session: {
			id: "session-binding-1",
		},
	},
	rateLimitResponse: null,
}));

vi.mock("@/services/auth", () => ({
	getRequestAuthSession: async () => {
		state.sessionCalls += 1;
		return state.session;
	},
}));

vi.mock("@/lib/security/rate-limit", () => ({
	applyAnonymousRateLimit: async () => {
		state.rateLimitCalls += 1;
		return state.rateLimitResponse;
	},
}));

beforeEach(() => {
	state.sessionCalls = 0;
	state.rateLimitCalls = 0;
	state.session = {
		session: {
			id: "session-binding-1",
		},
	};
	state.rateLimitResponse = null;
});

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
				DB: {} as D1Database,
				BETTER_AUTH_SECRET: "better-auth-secret",
				BETTER_AUTH_URL: "https://example.test",
				SESSION_ACCESS_SECRET: "session-secret",
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
		expect(state.sessionCalls).toBe(0);
		expect(state.rateLimitCalls).toBe(0);
	});

	test("should resolve the session binding when provenance, cookie, and rate limit checks pass", async () => {
		const result = await resolveChatSessionAccess({
			request: new Request("https://oreai.orelbn.ca/api/chat", {
				method: "POST",
				headers: {
					origin: "https://oreai.orelbn.ca",
					"sec-fetch-site": "same-origin",
				},
			}),
			env: {
				DB: {} as D1Database,
				BETTER_AUTH_SECRET: "better-auth-secret",
				BETTER_AUTH_URL: "https://example.test",
				SESSION_ACCESS_SECRET: "session-secret",
			},
		});

		expect(result).toEqual({
			ok: true,
			sessionBindingId: "session-binding-1",
		});
		expect(state.sessionCalls).toBe(1);
		expect(state.rateLimitCalls).toBe(1);
	});

	test("should return the rate-limit response after session access passes", async () => {
		state.rateLimitResponse = Response.json(
			{
				error: "Too many requests. Please try again later.",
				retryAfterSeconds: 60,
			},
			{ status: 429 },
		);

		const result = await resolveChatSessionAccess({
			request: new Request("https://oreai.orelbn.ca/api/chat", {
				method: "POST",
				headers: {
					origin: "https://oreai.orelbn.ca",
					"sec-fetch-site": "same-origin",
				},
			}),
			env: {
				DB: {} as D1Database,
				BETTER_AUTH_SECRET: "better-auth-secret",
				BETTER_AUTH_URL: "https://example.test",
				SESSION_ACCESS_SECRET: "session-secret",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected a blocked response");
		}
		expect(result.response.status).toBe(429);
		expect(state.sessionCalls).toBe(1);
		expect(state.rateLimitCalls).toBe(1);
	});

	test("should return 401 when the request is trusted but no session exists", async () => {
		state.session = null;

		const result = await resolveChatSessionAccess({
			request: new Request("https://oreai.orelbn.ca/api/chat", {
				method: "POST",
				headers: {
					origin: "https://oreai.orelbn.ca",
					"sec-fetch-site": "same-origin",
				},
			}),
			env: {
				DB: {} as D1Database,
				BETTER_AUTH_SECRET: "better-auth-secret",
				BETTER_AUTH_URL: "https://example.test",
				SESSION_ACCESS_SECRET: "session-secret",
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
		expect(state.sessionCalls).toBe(1);
		expect(state.rateLimitCalls).toBe(0);
	});
});
