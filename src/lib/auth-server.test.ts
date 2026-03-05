import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";

const state = {
	getSessionResult: null as unknown,
	getSessionHeaders: [] as Headers[],
};

function resetState() {
	state.getSessionResult = null;
	state.getSessionHeaders = [];
}

mock.module("cloudflare:workers", () => ({
	env: {
		DB: {},
		BETTER_AUTH_URL: "http://localhost:3000",
		BETTER_AUTH_SECRET: "test-secret",
		OAUTH_GOOGLE_CLIENT_ID: "test-client-id",
		OAUTH_GOOGLE_CLIENT_SECRET: "test-client-secret",
	},
}));

mock.module("drizzle-orm/d1", () => ({
	drizzle: () => ({}),
}));

mock.module("better-auth/adapters/drizzle", () => ({
	drizzleAdapter: () => ({}),
}));

mock.module("./local-test-auth", () => ({
	getLocalTestEmailPasswordConfig: () => ({ enabled: false }),
}));

mock.module("better-auth", () => ({
	betterAuth: () => ({
		api: {
			getSession: async ({ headers }: { headers: Headers }) => {
				state.getSessionHeaders.push(headers);
				return state.getSessionResult;
			},
		},
	}),
}));

let getSessionFromHeaders: typeof import("./auth-server").getSessionFromHeaders;
let verifySessionFromRequest: typeof import("./auth-server").verifySessionFromRequest;

beforeAll(async () => {
	({ getSessionFromHeaders, verifySessionFromRequest } = await import(
		"./auth-server"
	));
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

describe("verifySessionFromRequest", () => {
	test("returns null when no session is returned", async () => {
		state.getSessionResult = null;

		const result = await verifySessionFromRequest(new Headers());

		expect(result).toBeNull();
		expect(state.getSessionHeaders).toHaveLength(1);
	});

	test("returns null when response does not include a session object", async () => {
		state.getSessionResult = {
			user: { id: "user-1" },
		};

		const result = await verifySessionFromRequest(new Headers());

		expect(result).toBeNull();
	});

	test("returns the session payload when session exists", async () => {
		const expected = {
			session: { id: "session-1", userId: "user-1" },
			user: { id: "user-1", email: "user@example.com" },
		};
		state.getSessionResult = expected;

		const result = await verifySessionFromRequest(new Headers());

		expect(result).toMatchObject(expected);
	});

	test("accepts a Request input and forwards its headers to getSession", async () => {
		const request = new Request("http://localhost/api/chat", {
			headers: {
				cookie: "session-token=test",
			},
		});
		state.getSessionResult = {
			session: { id: "session-1", userId: "user-1" },
			user: { id: "user-1" },
		};

		await verifySessionFromRequest(request);

		expect(state.getSessionHeaders).toHaveLength(1);
		expect(state.getSessionHeaders[0]).toBe(request.headers);
	});
});

describe("getSessionFromHeaders", () => {
	test("calls Better Auth getSession with provided headers", async () => {
		const headers = new Headers({ cookie: "session-token=test" });
		const expected = {
			session: { id: "session-2", userId: "user-2" },
			user: { id: "user-2" },
		};
		state.getSessionResult = expected;

		const result = await getSessionFromHeaders(headers);

		expect(result).toMatchObject(expected);
		expect(state.getSessionHeaders).toHaveLength(1);
		expect(state.getSessionHeaders[0]).toBe(headers);
	});
});
