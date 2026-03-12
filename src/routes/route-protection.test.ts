import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	vi,
	test,
} from "vitest";

const state = {
	user: null as { id: string } | null,
};

function resetState() {
	state.user = null;
}

vi.mock("@/modules/auth/logic/auth", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/modules/auth/logic/auth")>();
	return {
		...actual,
		getProtectedRouteContext: async (locationHref: string) => {
			if (!state.user) {
				const error = new Response(null, { status: 307 }) as Response & {
					options?: { to?: string; search?: { redirect?: string } };
				};
				error.options = {
					to: "/sign-in",
					search: { redirect: locationHref },
				};
				throw error;
			}

			return { user: state.user };
		},
		redirectAuthenticatedUser: async () => {
			if (state.user) {
				const error = new Response(null, { status: 307 }) as Response & {
					options?: { to?: string };
				};
				error.options = { to: "/" };
				throw error;
			}
		},
	};
});

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
	vi.restoreAllMocks();
});

describe("protected route guards", () => {
	test("redirects unauthenticated users to /sign-in with redirect target", async () => {
		let thrown: unknown;
		try {
			await AuthenticatedRoute.options.beforeLoad?.({
				location: { href: "http://localhost/" },
			} as never);
		} catch (error) {
			thrown = error;
		}

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

	test("allows authenticated users through protected route", async () => {
		state.user = { id: "user-1" };
		const result = await AuthenticatedRoute.options.beforeLoad?.({
			location: { href: "http://localhost/" },
		} as never);
		expect(result).toEqual({ user: { id: "user-1" } });
	});

	test("redirects authenticated users away from /sign-in", async () => {
		state.user = { id: "user-1" };
		let thrown: unknown;
		try {
			await SignInRoute.options.beforeLoad?.({} as never);
		} catch (error) {
			thrown = error;
		}

		expect((thrown as Response).status).toBe(307);
		expect(
			(thrown as Response & { options?: { to?: string } }).options?.to,
		).toBe("/");
	});
});
