import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const state = {
	getSessionResult: null as unknown,
	getSessionHeaders: [] as Headers[],
};

function resetState() {
	state.getSessionResult = null;
	state.getSessionHeaders = [];
}

function setupModuleMocks() {
	mock.module("cloudflare:workers", () => ({
		env: {
			DB: {},
			BETTER_AUTH_URL: "http://localhost:3000",
			BETTER_AUTH_SECRET: "test-secret",
			OAUTH_GOOGLE_CLIENT_ID: "test-client-id",
			OAUTH_GOOGLE_CLIENT_SECRET: "test-client-secret",
		},
	}));

	mock.module("drizzle-orm/d1", () => ({ drizzle: () => ({}) }));
	mock.module("better-auth/adapters/drizzle", () => ({
		drizzleAdapter: () => ({}),
	}));
	mock.module("./local-test-auth", () => ({
		getLocalTestEmailPasswordConfig: () => ({ enabled: false }),
	}));

	mock.module("better-auth", () => ({
		betterAuth: () => ({
			api: {
				getSession: async () => null,
			},
		}),
	}));
}

let auth: typeof import("./auth-server").auth;
let getSessionFromHeaders: typeof import("./auth-server").getSessionFromHeaders;
let verifySessionFromRequest: typeof import("./auth-server").verifySessionFromRequest;

beforeEach(async () => {
	resetState();
	mock.restore();
	setupModuleMocks();
	({ auth, getSessionFromHeaders, verifySessionFromRequest } = await import(
		"./auth-server"
	));
	auth.api.getSession = async ({ headers }: { headers: Headers }) => {
		state.getSessionHeaders.push(headers);
		return state.getSessionResult;
	};
});

afterEach(() => {
	mock.restore();
});

describe("verifySessionFromRequest", () => {
	test("returns null when no session payload exists", async () => {
		state.getSessionResult = null;
		await expect(verifySessionFromRequest(new Headers())).resolves.toBeNull();
		expect(state.getSessionHeaders).toHaveLength(1);
	});

	test("returns null when result does not contain session object", async () => {
		state.getSessionResult = { user: { id: "user-1" } };
		await expect(verifySessionFromRequest(new Headers())).resolves.toBeNull();
	});

	test("returns session payload when available", async () => {
		state.getSessionResult = {
			session: { id: "session-1", userId: "user-1" },
			user: { id: "user-1", email: "user@example.com" },
		};
		await expect(
			verifySessionFromRequest(new Headers()),
		).resolves.toMatchObject({
			session: { id: "session-1" },
			user: { id: "user-1" },
		});
	});

	test("accepts Request input and forwards request headers", async () => {
		state.getSessionResult = {
			session: { id: "session-1", userId: "user-1" },
			user: { id: "user-1" },
		};
		const request = new Request("http://localhost/api/chat", {
			headers: { cookie: "session-token=test" },
		});

		await verifySessionFromRequest(request);
		expect(state.getSessionHeaders[0]).toBe(request.headers);
	});
});

describe("getSessionFromHeaders", () => {
	test("delegates to Better Auth getSession", async () => {
		const headers = new Headers({ cookie: "session-token=test" });
		state.getSessionResult = {
			session: { id: "session-2", userId: "user-2" },
			user: { id: "user-2" },
		};

		await expect(getSessionFromHeaders(headers)).resolves.toMatchObject({
			session: { id: "session-2" },
			user: { id: "user-2" },
		});
		expect(state.getSessionHeaders[0]).toBe(headers);
	});
});
