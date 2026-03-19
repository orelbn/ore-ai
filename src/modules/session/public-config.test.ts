import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted<{
	request: Request;
	env: {
		DB: D1Database;
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL: string;
		TURNSTILE_SITE_KEY: string;
	};
	session: {
		session: {
			id: string;
		};
	} | null;
}>(() => ({
	request: new Request("http://localhost/"),
	env: {
		DB: {} as D1Database,
		BETTER_AUTH_SECRET: "better-auth-secret",
		BETTER_AUTH_URL: "https://example.test",
		TURNSTILE_SITE_KEY: "site-key",
	},
	session: null,
}));

vi.mock("cloudflare:workers", () => ({
	env: state.env,
}));

vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => state.request,
}));

vi.mock("@/services/auth", () => ({
	getRequestAuthSession: async () => state.session,
}));

let resolveSessionAccessPublicConfig: typeof import("./public-config").resolveSessionAccessPublicConfig;

beforeAll(async () => {
	({ resolveSessionAccessPublicConfig } = await import("./public-config"));
});

beforeEach(() => {
	state.request = new Request("http://localhost/");
	state.env.TURNSTILE_SITE_KEY = "site-key";
	state.env.DB = {} as D1Database;
	state.env.BETTER_AUTH_SECRET = "better-auth-secret";
	state.env.BETTER_AUTH_URL = "https://example.test";
	state.session = null;
});

describe("getSessionAccessPublicConfig", () => {
	test("should report no session access when Better Auth has no current session", async () => {
		await expect(
			resolveSessionAccessPublicConfig({
				request: state.request,
				env: state.env,
			}),
		).resolves.toEqual({
			turnstileSiteKey: "site-key",
			hasSessionAccess: false,
			sessionBindingId: null,
		});
	});

	test("should expose the current Better Auth session binding", async () => {
		state.session = {
			session: {
				id: "session-1",
			},
		};

		await expect(
			resolveSessionAccessPublicConfig({
				request: state.request,
				env: state.env,
			}),
		).resolves.toEqual({
			turnstileSiteKey: "site-key",
			hasSessionAccess: true,
			sessionBindingId: "session-1",
		});
	});

	test("should trim the public Turnstile site key before returning it", async () => {
		state.env.TURNSTILE_SITE_KEY = " site-key ";

		await expect(
			resolveSessionAccessPublicConfig({
				request: state.request,
				env: state.env,
			}),
		).resolves.toMatchObject({
			turnstileSiteKey: "site-key",
		});
	});
});
