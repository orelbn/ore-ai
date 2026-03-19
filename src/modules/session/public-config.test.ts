import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted<{
	request: Request;
	env: {
		SESSION_ACCESS_SECRET: string;
		TURNSTILE_SITE_KEY: string;
	};
	hasSessionAccess: boolean;
	sessionBindingId: string | null;
}>(() => ({
	request: new Request("http://localhost/"),
	env: {
		SESSION_ACCESS_SECRET: "session-secret",
		TURNSTILE_SITE_KEY: "site-key",
	},
	hasSessionAccess: false,
	sessionBindingId: null,
}));

vi.mock("cloudflare:workers", () => ({
	env: state.env,
}));

vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => state.request,
}));

vi.mock("./server/session-access-cookie", () => ({
	hasValidSessionAccessCookie: async () => state.hasSessionAccess,
	getSessionAccessBindingId: async () => state.sessionBindingId,
}));

let resolveSessionAccessPublicConfig: typeof import("./public-config").resolveSessionAccessPublicConfig;

beforeAll(async () => {
	({ resolveSessionAccessPublicConfig } = await import("./public-config"));
});

beforeEach(() => {
	state.request = new Request("http://localhost/");
	state.env.SESSION_ACCESS_SECRET = "session-secret";
	state.env.TURNSTILE_SITE_KEY = "site-key";
	state.hasSessionAccess = false;
	state.sessionBindingId = null;
});

describe("getSessionAccessPublicConfig", () => {
	test("should keep exposing the binding when the signed cookie is present but stale", async () => {
		state.hasSessionAccess = false;
		state.sessionBindingId = "binding-1";

		await expect(
			resolveSessionAccessPublicConfig({
				request: state.request,
				env: state.env,
			}),
		).resolves.toEqual({
			turnstileSiteKey: "site-key",
			hasSessionAccess: false,
			sessionBindingId: "binding-1",
		});
	});

	test("should report active access only when the cookie is valid and bound", async () => {
		state.hasSessionAccess = true;
		state.sessionBindingId = "binding-1";

		await expect(
			resolveSessionAccessPublicConfig({
				request: state.request,
				env: state.env,
			}),
		).resolves.toEqual({
			turnstileSiteKey: "site-key",
			hasSessionAccess: true,
			sessionBindingId: "binding-1",
		});
	});
});
