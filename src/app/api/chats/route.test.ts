import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";

type TestSession = {
	user: {
		id: string;
	};
} | null;

const state = {
	session: null as TestSession,
	chats: [] as Array<{
		id: string;
		title: string;
		updatedAt: number;
		lastMessagePreview: string;
	}>,
	calls: [] as string[],
};

function resetState() {
	state.session = null;
	state.chats = [];
	state.calls = [];
}

mock.module("@/lib/auth", () => ({
	verifySession: async () => state.session,
	getAuth: async () => ({
		handler: async () => new Response(null, { status: 200 }),
	}),
}));

mock.module("@/lib/chat/repository", () => ({
	appendMessagesToChat: async () => {},
	buildChatTitleFromMessage: () => "Session title",
	createChatSession: async () => {},
	deleteChatForUser: async () => true,
	getChatSessionOwner: async () => null,
	listChatSummariesForUser: async (userId: string) => {
		state.calls.push(userId);
		return state.chats;
	},
	loadChatForUser: async () => null,
	loadRecentChatMessagesForUser: async () => [],
}));

let GET: typeof import("./route").GET;

beforeAll(async () => {
	({ GET } = await import("./route"));
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

describe("GET /api/chats", () => {
	test("returns 401 when unauthenticated", async () => {
		const response = await GET(new Request("http://localhost/api/chats"));
		expect(response.status).toBe(401);
	});

	test("returns user chat summaries for authenticated sessions", async () => {
		state.session = { user: { id: "user-1" } };
		state.chats = [
			{
				id: "session-2",
				title: "Roadmap",
				updatedAt: 1700000000000,
				lastMessagePreview: "Outline Q2 milestones",
			},
			{
				id: "session-1",
				title: "Architecture",
				updatedAt: 1690000000000,
				lastMessagePreview: "Compare options",
			},
		];

		const response = await GET(new Request("http://localhost/api/chats"));
		const payload = (await response.json()) as {
			chats: typeof state.chats;
		};

		expect(response.status).toBe(200);
		expect(payload.chats).toEqual(state.chats);
		expect(state.calls).toEqual(["user-1"]);
	});
});
