import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	mock,
	test,
} from "bun:test";

const state = {
	userCount: 0,
	ipCount: 0,
	userCalls: [] as Array<{ userId: string; since: Date }>,
	ipCalls: [] as Array<{ ipHash: string; since: Date }>,
};

mock.module("@/db/query", () => ({
	queryUserMessageCountSince: async (input: {
		userId: string;
		since: Date;
	}) => {
		state.userCalls.push(input);
		return state.userCount;
	},
	queryIpMessageCountSince: async (input: { ipHash: string; since: Date }) => {
		state.ipCalls.push(input);
		return state.ipCount;
	},
}));

let checkChatRateLimit: typeof import("./rate-limit").checkChatRateLimit;
let constants: typeof import("./constants");

beforeAll(async () => {
	({ checkChatRateLimit } = await import("./rate-limit"));
	constants = await import("./constants");
});

afterEach(() => {
	state.userCount = 0;
	state.ipCount = 0;
	state.userCalls = [];
	state.ipCalls = [];
	mock.restore();
});

afterAll(() => {
	mock.restore();
});

describe("checkChatRateLimit", () => {
	test("limits by user count first", async () => {
		state.userCount = constants.CHAT_RATE_LIMIT_PER_USER;
		state.ipCount = 0;

		const result = await checkChatRateLimit({
			userId: "user-1",
			ipHash: "iphash",
		});

		expect(result).toEqual({
			limited: true,
			reason: "user",
			userCount: constants.CHAT_RATE_LIMIT_PER_USER,
			ipCount: 0,
		});
		expect(state.userCalls).toHaveLength(1);
		expect(state.ipCalls).toHaveLength(1);
	});

	test("limits by ip when user is below limit", async () => {
		state.userCount = constants.CHAT_RATE_LIMIT_PER_USER - 1;
		state.ipCount = constants.CHAT_RATE_LIMIT_PER_IP;

		const result = await checkChatRateLimit({
			userId: "user-1",
			ipHash: "iphash",
		});

		expect(result.limited).toBe(true);
		expect(result.reason).toBe("ip");
	});

	test("does not query ip bucket when ipHash is null", async () => {
		const result = await checkChatRateLimit({
			userId: "user-1",
			ipHash: null,
		});

		expect(result).toEqual({
			limited: false,
			reason: null,
			userCount: 0,
			ipCount: 0,
		});
		expect(state.ipCalls).toHaveLength(0);
	});
});
