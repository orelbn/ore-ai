import { beforeEach, describe, expect, test, vi } from "vitest";
import { resolveChatSessionAccess } from "./chat-access";

const state = vi.hoisted<{
	requireCalls: number;
	rateLimitCalls: number;
	sessionBindingId: string | null;
	requireResponse: Response | null;
	rateLimitResponse: Response | null;
}>(() => ({
	requireCalls: 0,
	rateLimitCalls: 0,
	sessionBindingId: "session-binding-1",
	requireResponse: null,
	rateLimitResponse: null,
}));

vi.mock("./session-access-cookie", () => ({
	getSessionAccessBindingId: async () => state.sessionBindingId,
}));

vi.mock("./verification", () => ({
	requireSessionAccess: async () => {
		state.requireCalls += 1;
		return state.requireResponse;
	},
}));

vi.mock("@/lib/security/rate-limit", () => ({
	applyAnonymousRateLimit: async () => {
		state.rateLimitCalls += 1;
		return state.rateLimitResponse;
	},
}));

beforeEach(() => {
	state.requireCalls = 0;
	state.rateLimitCalls = 0;
	state.sessionBindingId = "session-binding-1";
	state.requireResponse = null;
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
		expect(state.requireCalls).toBe(0);
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
				SESSION_ACCESS_SECRET: "session-secret",
			},
		});

		expect(result).toEqual({
			ok: true,
			sessionBindingId: "session-binding-1",
		});
		expect(state.requireCalls).toBe(1);
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
				SESSION_ACCESS_SECRET: "session-secret",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected a blocked response");
		}
		expect(result.response.status).toBe(429);
		expect(state.requireCalls).toBe(1);
		expect(state.rateLimitCalls).toBe(1);
	});
});
