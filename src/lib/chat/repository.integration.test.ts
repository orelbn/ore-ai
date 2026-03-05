import type { UIMessage } from "ai";
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
	summaryRows: [] as Array<{
		id: string;
		title: string;
		updatedAt: Date;
		lastMessagePreview: string;
	}>,
	owner: null as { id: string; userId: string } | null,
	session: null as { id: string; title: string } | null,
	messageRows: [] as Array<{ id: string; role: string; partsJson: string }>,
	recentRows: [] as Array<{ id: string; role: string; partsJson: string }>,
	insertedSession: null as { id: string; userId: string; title: string } | null,
	insertedMessages: [] as Array<{
		id: string;
		sessionId: string;
		userId: string;
		role: "user" | "assistant" | "system";
		partsJson: string;
		textPreview: string;
		ipHash: string | null;
	}>,
	updatedSessionActivity: null as {
		chatId: string;
		userId: string;
		lastMessagePreview: string;
	} | null,
	deleted: [] as Array<{ chatId: string; userId: string }>,
};

function resetState() {
	state.summaryRows = [];
	state.owner = null;
	state.session = null;
	state.messageRows = [];
	state.recentRows = [];
	state.insertedSession = null;
	state.insertedMessages = [];
	state.updatedSessionActivity = null;
	state.deleted = [];
}

mock.module("@/db/query", () => ({
	queryChatSummariesByUser: async () => state.summaryRows,
	queryChatSessionOwner: async () => state.owner,
	insertChatSession: async (input: {
		id: string;
		userId: string;
		title: string;
	}) => {
		state.insertedSession = input;
	},
	queryChatMessagesForUser: async () => state.messageRows,
	queryRecentChatMessagesForUser: async () => state.recentRows,
	insertChatMessages: async (
		rows: Array<{
			id: string;
			sessionId: string;
			userId: string;
			role: "user" | "assistant" | "system";
			partsJson: string;
			textPreview: string;
			ipHash: string | null;
		}>,
	) => {
		state.insertedMessages = rows;
	},
	updateChatSessionActivity: async (input: {
		chatId: string;
		userId: string;
		lastMessagePreview: string;
	}) => {
		state.updatedSessionActivity = input;
	},
	queryChatSessionForUser: async () => state.session,
	deleteChatSessionForUser: async (input: {
		chatId: string;
		userId: string;
	}) => {
		state.deleted.push(input);
	},
	queryUserMessageCountSince: async () => 0,
	queryIpMessageCountSince: async () => 0,
}));

let repository: typeof import("./repository");

beforeAll(async () => {
	repository = await import("./repository");
});

afterEach(() => {
	resetState();
	mock.restore();
});

afterAll(() => {
	mock.restore();
});

function textMessage(
	id: string,
	role: UIMessage["role"],
	text: string,
): UIMessage {
	return { id, role, parts: [{ type: "text", text }] };
}

describe("chat repository", () => {
	test("maps chat summaries with timestamp conversion", async () => {
		state.summaryRows = [
			{
				id: "chat-1",
				title: "Roadmap",
				updatedAt: new Date("2026-03-01T00:00:00.000Z"),
				lastMessagePreview: "Plan Q2",
			},
		];

		await expect(
			repository.listChatSummariesForUser("user-1"),
		).resolves.toEqual([
			{
				id: "chat-1",
				title: "Roadmap",
				updatedAt: new Date("2026-03-01T00:00:00.000Z").getTime(),
				lastMessagePreview: "Plan Q2",
			},
		]);
	});

	test("maps message rows and filters non-text/invalid parts", async () => {
		state.messageRows = [
			{
				id: "m-1",
				role: "user",
				partsJson: JSON.stringify([
					{ type: "text", text: "hello" },
					{ type: "reasoning", text: "internal" },
				]),
			},
			{
				id: "m-2",
				role: "not-a-role",
				partsJson: "{bad json",
			},
		];

		await expect(
			repository.loadChatMessagesForUser({
				chatId: "chat-1",
				userId: "user-1",
			}),
		).resolves.toEqual([
			{ id: "m-1", role: "user", parts: [{ type: "text", text: "hello" }] },
			{ id: "m-2", role: "assistant", parts: [] },
		]);
	});

	test("reverses recent rows to chronological order", async () => {
		state.recentRows = [
			{
				id: "m-2",
				role: "assistant",
				partsJson: JSON.stringify([{ type: "text", text: "second" }]),
			},
			{
				id: "m-1",
				role: "user",
				partsJson: JSON.stringify([{ type: "text", text: "first" }]),
			},
		];

		const messages = await repository.loadRecentChatMessagesForUser({
			chatId: "chat-1",
			userId: "user-1",
			limit: 2,
		});

		expect(messages.map((entry) => entry.id)).toEqual(["m-1", "m-2"]);
	});

	test("appendMessagesToChat persists message rows and updates session activity", async () => {
		const randomUUID = mock(() => "uuid-fixed");
		Object.defineProperty(crypto, "randomUUID", {
			value: randomUUID,
			configurable: true,
		});

		await repository.appendMessagesToChat({
			chatId: "chat-1",
			userId: "user-1",
			messages: [
				textMessage("m-1", "user", "first input"),
				textMessage("   ", "assistant", "assistant response"),
			],
			ipHash: "iphash",
		});

		expect(state.insertedMessages).toHaveLength(2);
		expect(state.insertedMessages[0]).toMatchObject({
			id: "m-1",
			ipHash: "iphash",
			textPreview: "first input",
		});
		expect(state.insertedMessages[1]?.id).toContain(
			"chat-1:assistant:1:uuid-fixed",
		);
		expect(state.insertedMessages[1]?.ipHash).toBeNull();
		expect(state.updatedSessionActivity).toEqual({
			chatId: "chat-1",
			userId: "user-1",
			lastMessagePreview: "assistant response",
		});
	});

	test("loadChatForUser returns null when session does not exist", async () => {
		state.session = null;
		await expect(
			repository.loadChatForUser({ chatId: "chat-1", userId: "user-1" }),
		).resolves.toBeNull();
	});

	test("deleteChatForUser returns false when chat does not exist", async () => {
		state.session = null;
		await expect(
			repository.deleteChatForUser({ chatId: "chat-1", userId: "user-1" }),
		).resolves.toBe(false);
		expect(state.deleted).toEqual([]);
	});

	test("deleteChatForUser deletes existing session", async () => {
		state.session = { id: "chat-1", title: "Title" };
		state.messageRows = [
			{
				id: "m-1",
				role: "user",
				partsJson: JSON.stringify([{ type: "text", text: "hi" }]),
			},
		];

		await expect(
			repository.deleteChatForUser({ chatId: "chat-1", userId: "user-1" }),
		).resolves.toBe(true);
		expect(state.deleted).toEqual([{ chatId: "chat-1", userId: "user-1" }]);
	});
});
