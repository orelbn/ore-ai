import { beforeEach, describe, expect, test, vi } from "vitest";
import { handlePostSessionVerify, requireSessionAccess } from "./verification";
import { SESSION_VERIFY_MAX_BODY_BYTES } from "../constants";

const state = vi.hoisted<{
	session: {
		session: {
			id: string;
		};
	} | null;
	verifiedToken: boolean;
	verifyCalls: number;
	createAnonymousSessionCalls: number;
	authResponse: Response;
	rateLimitResponse: Response | null;
	env: {
		DB: D1Database;
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL: string;
		TURNSTILE_SECRET_KEY: string;
		SESSION_ACCESS_SECRET: string;
	};
}>(() => ({
	session: null,
	verifiedToken: true,
	verifyCalls: 0,
	createAnonymousSessionCalls: 0,
	authResponse: new Response(null, {
		status: 200,
		headers: {
			"Set-Cookie": "ore_ai_session=test",
		},
	}),
	rateLimitResponse: null,
	env: {
		DB: {} as D1Database,
		BETTER_AUTH_SECRET: "better-auth-secret",
		BETTER_AUTH_URL: "https://oreai.orelbn.ca",
		TURNSTILE_SECRET_KEY: "turnstile-secret",
		SESSION_ACCESS_SECRET: "session-secret",
	},
}));

vi.mock("cloudflare:workers", () => ({
	env: state.env,
}));

vi.mock("@/services/auth", () => ({
	createAnonymousSessionResponse: async () => {
		state.createAnonymousSessionCalls += 1;
		return state.authResponse;
	},
	getRequestAuthSession: async () => state.session,
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

beforeEach(() => {
	state.session = null;
	state.verifiedToken = true;
	state.verifyCalls = 0;
	state.createAnonymousSessionCalls = 0;
	state.authResponse = new Response(null, {
		status: 200,
		headers: {
			"Set-Cookie": "ore_ai_session=test",
		},
	});
	state.rateLimitResponse = null;
});

describe("session verification", () => {
	test("should reject protected requests when session access is missing", async () => {
		const response = await requireSessionAccess({
			request: new Request("http://localhost/api/chat"),
		});

		expect(response?.status).toBe(401);
		await expect(response?.json()).resolves.toEqual({
			error: "Session access required.",
		});
	});

	test("should allow protected requests when session access is present", async () => {
		state.session = {
			session: {
				id: "session-1",
			},
		};

		const response = await requireSessionAccess({
			request: new Request("http://localhost/api/chat"),
		});

		expect(response).toBeNull();
	});

	test("should set the session cookie when verification succeeds", async () => {
		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(204);
		expect(response.headers.get("Set-Cookie")).toBe("ore_ai_session=test");
		expect(state.verifyCalls).toBe(1);
		expect(state.createAnonymousSessionCalls).toBe(1);
	});

	test("should skip anonymous session creation when a Better Auth session already exists", async () => {
		state.session = {
			session: {
				id: "session-1",
			},
		};

		const response = await handlePostSessionVerify(
			new Request("http://localhost/api/session/verify", {
				method: "POST",
				body: JSON.stringify({ token: "token" }),
			}),
		);

		expect(response.status).toBe(204);
		expect(response.headers.get("Set-Cookie")).toBeNull();
		expect(state.verifyCalls).toBe(1);
		expect(state.createAnonymousSessionCalls).toBe(0);
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
		expect(state.createAnonymousSessionCalls).toBe(0);
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
		expect(state.createAnonymousSessionCalls).toBe(0);
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
		expect(state.createAnonymousSessionCalls).toBe(0);
	});

	test("should fail closed when Better Auth session creation does not return a cookie", async () => {
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
		expect(state.createAnonymousSessionCalls).toBe(1);
	});

	test("should fail closed when Better Auth session creation itself fails", async () => {
		state.authResponse = new Response(null, { status: 500 });

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
		expect(state.createAnonymousSessionCalls).toBe(1);
	});
});
