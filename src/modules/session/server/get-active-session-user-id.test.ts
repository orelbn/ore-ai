import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
	session: null as { user?: { id?: string } } | null,
	getSessionCalls: 0,
}));

vi.mock("@/services/auth", () => ({
	auth: {
		api: {
			getSession: async ({ headers }: { headers: Headers }) => {
				void headers;
				state.getSessionCalls += 1;
				return state.session;
			},
		},
	},
}));

let getActiveSessionUserId: typeof import("./get-active-session-user-id").getActiveSessionUserId;

beforeAll(async () => {
	({ getActiveSessionUserId } = await import("./get-active-session-user-id"));
});

beforeEach(() => {
	state.session = null;
	state.getSessionCalls = 0;
});

describe("getActiveSessionUserId", () => {
	test("should return the active user id when better auth resolves a session", async () => {
		state.session = { user: { id: "user-1" } };

		await expect(
			getActiveSessionUserId(new Headers({ cookie: "session=1" })),
		).resolves.toBe("user-1");
		expect(state.getSessionCalls).toBe(1);
	});

	test("should return null when no usable session exists", async () => {
		state.session = { user: {} };

		await expect(getActiveSessionUserId(new Headers())).resolves.toBeNull();
		expect(state.getSessionCalls).toBe(1);
	});
});
