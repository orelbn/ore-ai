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
	getAuthCalls: 0,
	handlerMethods: [] as string[],
};

function resetState() {
	state.getAuthCalls = 0;
	state.handlerMethods = [];
}

mock.module("@/lib/auth", () => ({
	getAuth: async () => {
		state.getAuthCalls += 1;
		return {
			handler: async (request: Request) => {
				state.handlerMethods.push(request.method);
				return Response.json({ ok: true, method: request.method });
			},
		};
	},
}));

mock.module("better-auth/next-js", () => ({
	toNextJsHandler: (handler: (request: Request) => Promise<Response>) => ({
		GET: handler,
		POST: handler,
	}),
}));

let GET: typeof import("./route").GET;
let POST: typeof import("./route").POST;

beforeAll(async () => {
	({ GET, POST } = await import("./route"));
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

describe("/api/auth/[...all]", () => {
	test("does not call getAuth during module import", () => {
		expect(state.getAuthCalls).toBe(0);
	});

	test("resolves auth lazily per request", async () => {
		const getResponse = await GET(
			new Request("http://localhost/api/auth/session", { method: "GET" }),
		);
		const postResponse = await POST(
			new Request("http://localhost/api/auth/session", { method: "POST" }),
		);

		expect(getResponse.status).toBe(200);
		expect(postResponse.status).toBe(200);
		expect(state.getAuthCalls).toBe(2);
		expect(state.handlerMethods).toEqual(["GET", "POST"]);
	});
});
