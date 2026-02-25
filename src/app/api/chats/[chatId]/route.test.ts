import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import type { UIMessage } from "ai";

type TestSession = {
	user: {
		id: string;
	};
} | null;

type ChatOwner = {
	id: string;
	userId: string;
} | null;

const contextWithChatId = (chatId: string) => ({
	params: Promise.resolve({ chatId }),
});

const state = {
	session: null as TestSession,
	owner: null as ChatOwner,
	chatDetail: null as {
		id: string;
		title: string;
		messages: UIMessage[];
	} | null,
	deleted: [] as Array<{ chatId: string; userId: string }>,
	loaded: [] as Array<{ chatId: string; userId: string }>,
};

function resetState() {
	state.session = null;
	state.owner = null;
	state.chatDetail = null;
	state.deleted = [];
	state.loaded = [];
}

mock.module("@/lib/auth", () => ({
	verifySession: async () => state.session,
}));

mock.module("@/lib/chat/repository", () => ({
	appendMessagesToChat: async () => {},
	buildChatTitleFromMessage: () => "Session title",
	createChatSession: async () => {},
	listChatSummariesForUser: async () => [],
	getChatSessionOwner: async () => state.owner,
	loadChatForUser: async (input: { chatId: string; userId: string }) => {
		state.loaded.push(input);
		return state.chatDetail;
	},
	deleteChatForUser: async (input: { chatId: string; userId: string }) => {
		state.deleted.push(input);
		return true;
	},
	loadRecentChatMessagesForUser: async () => [],
}));

let GET: typeof import("./route").GET;
let DELETE: typeof import("./route").DELETE;

beforeAll(async () => {
	({ GET, DELETE } = await import("./route"));
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

describe("/api/chats/[chatId]", () => {
	test("GET returns 401 when unauthenticated", async () => {
		const response = await GET(
			new Request("http://localhost"),
			contextWithChatId("session-1"),
		);
		expect(response.status).toBe(401);
	});

	test("DELETE returns 401 when unauthenticated", async () => {
		const response = await DELETE(
			new Request("http://localhost"),
			contextWithChatId("session-1"),
		);
		expect(response.status).toBe(401);
	});

	test("returns 400 for invalid route ids", async () => {
		state.session = { user: { id: "user-1" } };
		const response = await GET(
			new Request("http://localhost"),
			contextWithChatId("../bad"),
		);
		expect(response.status).toBe(400);
	});

	test("returns 404 when the session does not exist", async () => {
		state.session = { user: { id: "user-1" } };
		state.owner = null;

		const response = await GET(
			new Request("http://localhost"),
			contextWithChatId("session-1"),
		);

		expect(response.status).toBe(404);
	});

	test("returns 403 when session owner differs from authenticated user", async () => {
		state.session = { user: { id: "user-1" } };
		state.owner = {
			id: "session-1",
			userId: "user-2",
		};

		const response = await GET(
			new Request("http://localhost"),
			contextWithChatId("session-1"),
		);

		expect(response.status).toBe(403);
	});

	test("GET returns the session and messages when ownership matches", async () => {
		state.session = { user: { id: "user-1" } };
		state.owner = {
			id: "session-1",
			userId: "user-1",
		};
		state.chatDetail = {
			id: "session-1",
			title: "Weekly planning",
			messages: [
				{
					id: "message-1",
					role: "user",
					parts: [{ type: "text", text: "Plan my week" }],
				},
				{
					id: "message-2",
					role: "assistant",
					parts: [{ type: "text", text: "Here is a draft plan" }],
				},
			],
		};

		const response = await GET(
			new Request("http://localhost"),
			contextWithChatId("session-1"),
		);
		const payload = (await response.json()) as typeof state.chatDetail;

		expect(response.status).toBe(200);
		expect(payload).toEqual(state.chatDetail);
		expect(state.loaded).toEqual([{ chatId: "session-1", userId: "user-1" }]);
	});

	test("DELETE removes the session when ownership matches", async () => {
		state.session = { user: { id: "user-1" } };
		state.owner = {
			id: "session-1",
			userId: "user-1",
		};

		const response = await DELETE(
			new Request("http://localhost"),
			contextWithChatId("session-1"),
		);

		expect(response.status).toBe(204);
		expect(state.deleted).toEqual([{ chatId: "session-1", userId: "user-1" }]);
	});
});
