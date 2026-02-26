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
	handlerMethods: [] as string[],
};

function resetState() {
	state.handlerMethods = [];
}

mock.module("@/lib/auth-server", () => ({
	auth: {
		handler: async (request: Request) => {
			state.handlerMethods.push(request.method);
			return Response.json({ ok: true, method: request.method });
		},
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
	test("delegates GET and POST requests to the auth handler", async () => {
		const getResponse = await GET(
			new Request("http://localhost/api/auth/session", { method: "GET" }),
		);
		const postResponse = await POST(
			new Request("http://localhost/api/auth/session", { method: "POST" }),
		);

		expect(getResponse.status).toBe(200);
		expect(postResponse.status).toBe(200);
		expect(state.handlerMethods).toEqual(["GET", "POST"]);
	});
});
