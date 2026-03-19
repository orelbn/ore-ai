import { beforeEach, describe, expect, test, vi } from "vitest";
import { handlePostSessionVerify, requireSessionAccess } from "./verification";
import { SESSION_VERIFY_MAX_BODY_BYTES } from "../constants";

const state = vi.hoisted<{
	hasSessionAccess: boolean;
	sessionBindingId: string | null;
	verifiedToken: boolean;
	verifyCalls: number;
	createdSessionId: string | undefined;
	setCookieValue: string;
	rateLimitResponse: Response | null;
	authSession: { session: { id: string } } | null;
	authResponse: Response;
	authCreateCalls: number;
	env: {
		DB: D1Database;
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL: string;
		TURNSTILE_SECRET_KEY: string;
		SESSION_ACCESS_SECRET: string;
	};
}>(() => ({
	hasSessionAccess: false,
	sessionBindingId: null,
	verifiedToken: true,
	verifyCalls: 0,
	createdSessionId: undefined,
	setCookieValue: "ore_ai_session=test",
	rateLimitResponse: null,
	authSession: null,
	authResponse: new Response(null, {
		status: 200,
		headers: [
			["Set-Cookie", "ore_ai_session=auth-token; Path=/; HttpOnly"],
			["Set-Cookie", "ore_ai_session_data=cache; Path=/; HttpOnly"],
		],
	}),
	authCreateCalls: 0,
	env: {
		DB: {} as D1Database,
		BETTER_AUTH_SECRET: "better-auth-secret",
		BETTER_AUTH_URL: "https://example.test",
		TURNSTILE_SECRET_KEY: "turnstile-secret",
		SESSION_ACCESS_SECRET: "session-secret",
	},
}));

vi.mock("cloudflare:workers", () => ({
	env: state.env,
}));

vi.mock("./session-access-cookie", () => ({
	hasValidSessionAccessCookie: async () => state.hasSessionAccess,
	getSessionAccessBindingId: async () => state.sessionBindingId,
	createSessionAccessCookie: async (_secret: string, sessionId?: string) => {
		state.createdSessionId = sessionId;
		return state.setCookieValue;
	},
}));

vi.mock("@/services/cloudflare/turnstile", () => ({
	verifyTurnstileToken: async () => {
		state.verifyCalls += 1;
		return state.verifiedToken;
	},
}));

vi.mock("@/lib/security/rate-limit", () => ({
	applyAnonymousRateLimit: async () => state.rateLimitResponse,
}));

vi.mock("@/services/auth", () => ({
	getRequestAuthSession: async () => state.authSession,
	createAnonymousSessionResponse: async () => {
		state.authCreateCalls += 1;
		return state.authResponse;
	},
}));

beforeEach(() => {
	state.hasSessionAccess = false;
	state.sessionBindingId = null;
	state.verifiedToken = true;
	state.verifyCalls = 0;
	state.createdSessionId = undefined;
	state.setCookieValue = "ore_ai_session=test";
	state.rateLimitResponse = null;
	state.authSession = null;
	state.authResponse = new Response(null, {
		status: 200,
		headers: [
			["Set-Cookie", "ore_ai_session=auth-token; Path=/; HttpOnly"],
			["Set-Cookie", "ore_ai_session_data=cache; Path=/; HttpOnly"],
		],
	});
	state.authCreateCalls = 0;
});

describe("session verification", () => {
	test("should reject protected requests when session access is missing", async () => {
		const response = await requireSessionAccess({
			request: new Request("http://localhost/api/chat"),
			sessionSecret: "session-secret",
		});

		expect(response?.status).toBe(401);
		await expect(response?.json()).resolves.toEqual({
			error: "Session access required.",
		});
	});

	test("should allow protected requests when session access is present", async () => {
		state.hasSessionAccess = true;

		const response = await requireSessionAccess({
			request: new Request("http://localhost/api/chat"),
			sessionSecret: "session-secret",
		});

		expect(response).toBeNull();
	});

	test("should append Better Auth cookies alongside the legacy session-access cookie when verification succeeds", async () => {
		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(204);
		expect(response.headers.getSetCookie()).toEqual([
			"ore_ai_session=auth-token; Path=/; HttpOnly",
			"ore_ai_session_data=cache; Path=/; HttpOnly",
			"ore_ai_session=test",
		]);
		expect(state.verifyCalls).toBe(1);
		expect(state.authCreateCalls).toBe(1);
		expect(state.createdSessionId).toBeUndefined();
	});

	test("should preserve the existing session binding when reissuing the cookie", async () => {
		state.sessionBindingId = "binding-1";

		await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(state.createdSessionId).toBe("binding-1");
		expect(state.verifyCalls).toBe(1);
	});

	test("should skip anonymous session creation when Better Auth already has a session", async () => {
		state.authSession = { session: { id: "session-1" } };

		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(204);
		expect(response.headers.getSetCookie()).toEqual(["ore_ai_session=test"]);
		expect(state.authCreateCalls).toBe(0);
	});

	test("should reject malformed verification payloads when the token shape is invalid", async () => {
		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: 123 }),
			}),
		);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "Invalid request.",
		});
	});

	test("should reject untrusted request origins when provenance is cross-site", async () => {
		const response = await handlePostSessionVerify(
			new Request("https://oreai.orelbn.ca/api/session/verify", {
				method: "POST",
				headers: {
					origin: "https://attacker.example",
					"sec-fetch-site": "cross-site",
				},
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({
			error: "Invalid request.",
		});
		expect(state.verifyCalls).toBe(0);
	});

	test("should reject oversized verification payloads when the body exceeds the byte limit", async () => {
		const oversizedToken = "x".repeat(SESSION_VERIFY_MAX_BODY_BYTES);
		const body = JSON.stringify({ token: oversizedToken });
		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				headers: {
					"content-length": String(new TextEncoder().encode(body).byteLength),
				},
				body,
			}),
		);

		expect(response.status).toBe(413);
		await expect(response.json()).resolves.toEqual({
			error: "Invalid request.",
		});
	});

	test("should reject verification when Turnstile validation fails", async () => {
		state.verifiedToken = false;

		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({
			error: "Session verification failed.",
		});
		expect(state.verifyCalls).toBe(1);
		expect(state.authCreateCalls).toBe(0);
	});

	test("should return 429 before Turnstile validation when the caller is over quota", async () => {
		state.rateLimitResponse = Response.json(
			{
				error: "Too many requests. Please try again later.",
				retryAfterSeconds: 120,
			},
			{
				status: 429,
				headers: {
					"Retry-After": "120",
				},
			},
		);

		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(429);
		expect(response.headers.get("Set-Cookie")).toBeNull();
		await expect(response.json()).resolves.toEqual({
			error: "Too many requests. Please try again later.",
			retryAfterSeconds: 120,
		});
		expect(state.verifyCalls).toBe(0);
		expect(state.authCreateCalls).toBe(0);
	});

	test("should return 503 when Better Auth session creation fails", async () => {
		state.authResponse = new Response("failed", { status: 500 });

		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({
			error: "Session verification is unavailable.",
		});
		expect(state.authCreateCalls).toBe(1);
	});

	test("should return 503 when Better Auth does not emit any cookies", async () => {
		state.authResponse = new Response(null, { status: 200 });

		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({
			error: "Session verification is unavailable.",
		});
		expect(state.authCreateCalls).toBe(1);
	});
});
