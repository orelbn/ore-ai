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

mock.module("@/lib/auth-server", () => ({
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

let GET: typeof import("./$").GET;
let POST: typeof import("./$").POST;

beforeAll(async () => {
	({ GET, POST } = await import("./$"));
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

describe("/api/auth/$", () => {
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
