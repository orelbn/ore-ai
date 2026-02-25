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
	user: null as { id: string } | null,
};

function resetState() {
	state.user = null;
}

mock.module("@/lib/auth", () => ({
	getAuthenticatedUser: async () => state.user,
}));

let AuthenticatedRoute: typeof import("./_authenticated").Route;
let SignInRoute: typeof import("./sign-in").Route;

beforeAll(async () => {
	({ Route: AuthenticatedRoute } = await import("./_authenticated"));
	({ Route: SignInRoute } = await import("./sign-in"));
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

describe("protected route guards", () => {
	test("redirects unauthenticated users from / to /sign-in with redirect target", async () => {
		let thrown: unknown;
		try {
			await AuthenticatedRoute.options.beforeLoad?.({
				location: { href: "http://localhost/" },
			} as never);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeDefined();
		expect((thrown as Response).status).toBe(307);
		expect(
			(thrown as Response & { options?: { to?: string } }).options?.to,
		).toBe("/sign-in");
		expect(
			(
				thrown as Response & {
					options?: { search?: { redirect?: string } };
				}
			).options?.search?.redirect,
		).toBe("http://localhost/");
	});

	test("allows authenticated users through protected routes", async () => {
		state.user = { id: "user-1" };

		const result = await AuthenticatedRoute.options.beforeLoad?.({
			location: { href: "http://localhost/" },
		} as never);

		expect(result).toEqual({ user: { id: "user-1" } });
	});

	test("redirects authenticated users away from /sign-in to /", async () => {
		state.user = { id: "user-1" };
		let thrown: unknown;

		try {
			await SignInRoute.options.beforeLoad?.({} as never);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeDefined();
		expect((thrown as Response).status).toBe(307);
		expect(
			(thrown as Response & { options?: { to?: string } }).options?.to,
		).toBe("/");
	});
});
