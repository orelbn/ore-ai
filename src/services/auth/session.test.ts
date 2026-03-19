import { beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted<{
	session: { session: { id: string } } | null;
	handlerResponse: Response;
	handlerCalls: Request[];
	buildCalls: number;
}>(() => ({
	session: { session: { id: "session-1" } },
	handlerResponse: new Response("ok", { status: 200 }),
	handlerCalls: [],
	buildCalls: 0,
}));

vi.mock("cloudflare:workers", () => ({
	env: {
		DB: {} as D1Database,
		BETTER_AUTH_SECRET: "better-auth-secret",
		BETTER_AUTH_URL: "https://example.test",
	},
}));

vi.mock("better-auth/minimal", () => ({
	betterAuth: vi.fn((_options) => ({
		api: {
			getSession: vi.fn(async () => state.session),
		},
		handler: vi.fn(async (request: Request) => {
			state.handlerCalls.push(request);
			return state.handlerResponse;
		}),
	})),
}));

vi.mock("./config", () => ({
	buildOreAuthOptions: vi.fn(() => {
		state.buildCalls += 1;
		return {
			secret: "better-auth-secret",
			baseURL: "https://example.test",
		};
	}),
}));

import {
	createAnonymousSessionResponse,
	getRequestAuthSession,
	handleAuthRequest,
} from "./session";

beforeEach(() => {
	state.session = { session: { id: "session-1" } };
	state.handlerResponse = new Response("ok", { status: 200 });
	state.handlerCalls = [];
	state.buildCalls = 0;
});

describe("auth session service", () => {
	test("should look up the current auth session from request headers", async () => {
		const request = new Request("https://example.test/api/chat", {
			headers: {
				cookie: "ore_ai_session=test",
			},
		});

		await expect(getRequestAuthSession(request)).resolves.toEqual(
			state.session,
		);
		expect(state.buildCalls).toBe(1);
	});

	test("should create an anonymous session through the Better Auth handler", async () => {
		const request = new Request("https://example.test/api/session/verify", {
			method: "POST",
			headers: {
				cookie: "ore_ai_session=existing",
				"x-ignored": "value",
			},
			body: JSON.stringify({ token: "turnstile-token" }),
		});

		const response = await createAnonymousSessionResponse(request);

		expect(response).toBe(state.handlerResponse);
		expect(state.handlerCalls).toHaveLength(1);
		const forwardedRequest = state.handlerCalls[0];
		expect(forwardedRequest.method).toBe("POST");
		expect(forwardedRequest.url).toBe(
			"https://example.test/api/auth/sign-in/anonymous",
		);
		expect(forwardedRequest.headers.get("content-type")).toBe(
			"application/json",
		);
		expect(forwardedRequest.headers.get("cookie")).toBe(
			"ore_ai_session=existing",
		);
		expect(forwardedRequest.headers.get("x-ignored")).toBeNull();
		await expect(forwardedRequest.text()).resolves.toBe("{}");
	});

	test("should pass auth route requests through to Better Auth", async () => {
		const request = new Request("https://example.test/api/auth/session");

		const response = await handleAuthRequest(request);

		expect(response).toBe(state.handlerResponse);
		expect(state.handlerCalls).toHaveLength(1);
		expect(state.handlerCalls[0]).toBe(request);
	});
});
