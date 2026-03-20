import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { ConversationMessage } from "../types";

const state = vi.hoisted(() => ({
	findFirstResults: [] as Array<
		| {
				id: string;
				userId: string;
				updatedAt: Date;
		  }
		| {
				id: string;
				userId: string;
				messagesJson: string;
				updatedAt: Date;
		  }
		| null
	>,
	insertResults: [] as Array<{ meta?: { changes?: number }; changes?: number }>,
	updateResults: [] as Array<{ meta?: { changes?: number }; changes?: number }>,
	insertValues: [] as Array<Record<string, unknown>>,
	updateValues: [] as Array<Record<string, unknown>>,
}));

const database = {
	query: {
		chatConversations: {
			findFirst: vi.fn(async () => state.findFirstResults.shift() ?? null),
		},
	},
	insert: vi.fn(() => ({
		values: (values: Record<string, unknown>) => {
			state.insertValues.push(values);
			return {
				onConflictDoNothing: () => ({
					execute: async () =>
						state.insertResults.shift() ?? { meta: { changes: 1 } },
				}),
			};
		},
	})),
	update: vi.fn(() => ({
		set: (values: Record<string, unknown>) => {
			state.updateValues.push(values);
			return {
				where: () => ({
					execute: async () =>
						state.updateResults.shift() ?? { meta: { changes: 1 } },
				}),
			};
		},
	})),
};

vi.mock("cloudflare:workers", () => ({
	env: {
		DB: {},
	},
}));

vi.mock("drizzle-orm/d1", () => ({
	drizzle: () => database,
}));

let loadLatestConversationForUser: typeof import("./conversations").loadLatestConversationForUser;
let saveConversationForUser: typeof import("./conversations").saveConversationForUser;

beforeAll(async () => {
	({ loadLatestConversationForUser, saveConversationForUser } = await import(
		"./conversations"
	));
});

beforeEach(() => {
	state.findFirstResults = [];
	state.insertResults = [];
	state.updateResults = [];
	state.insertValues = [];
	state.updateValues = [];
	database.query.chatConversations.findFirst.mockClear();
	database.insert.mockClear();
	database.update.mockClear();
});

function textMessage(
	id: string,
	role: ConversationMessage["role"],
	text: string,
): ConversationMessage {
	return {
		id,
		role,
		parts: [{ type: "text", text }],
	} as ConversationMessage;
}

describe("conversation repo", () => {
	test("should drop stored history when persisted messages fail AI SDK validation", async () => {
		state.findFirstResults = [
			{
				id: "conversation-1",
				userId: "user-1",
				messagesJson: JSON.stringify([
					{
						id: "assistant-1",
						role: "assistant",
						parts: [{ type: "text", text: "hello" }],
					},
					{
						id: 123,
						role: "assistant",
						parts: [{ type: "text", text: "bad" }],
					},
					"not-a-message",
				]),
				updatedAt: new Date("2026-03-20T01:00:00.000Z"),
			},
		];

		await expect(loadLatestConversationForUser("user-1")).resolves.toEqual({
			conversationId: "conversation-1",
			messages: [],
		});
	});

	test("should insert a new conversation when one does not exist", async () => {
		state.findFirstResults = [null];
		const messages = [textMessage("u-1", "user", "hello")];

		await saveConversationForUser({
			userId: "user-1",
			conversationId: "conversation-1",
			messages,
		});

		expect(state.insertValues).toEqual([
			{
				id: "conversation-1",
				userId: "user-1",
				messagesJson: JSON.stringify(messages),
			},
		]);
		expect(state.updateValues).toEqual([]);
	});

	test("should reject saves to a conversation owned by another user", async () => {
		state.findFirstResults = [
			{
				id: "conversation-1",
				userId: "user-2",
				updatedAt: new Date("2026-03-20T01:00:00.000Z"),
			},
		];

		await expect(
			saveConversationForUser({
				userId: "user-1",
				conversationId: "conversation-1",
				messages: [textMessage("u-1", "user", "hello")],
			}),
		).rejects.toThrow("Conversation does not belong to the active user.");
	});

	test("should raise a conflict when every optimistic update attempt loses the race", async () => {
		const updatedAt = new Date("2026-03-20T01:00:00.000Z");
		state.findFirstResults = [
			{ id: "conversation-1", userId: "user-1", updatedAt },
			{ id: "conversation-1", userId: "user-1", updatedAt },
			{ id: "conversation-1", userId: "user-1", updatedAt },
		];
		state.updateResults = [
			{ meta: { changes: 0 } },
			{ meta: { changes: 0 } },
			{ meta: { changes: 0 } },
		];

		await expect(
			saveConversationForUser({
				userId: "user-1",
				conversationId: "conversation-1",
				messages: [textMessage("u-1", "user", "hello")],
			}),
		).rejects.toMatchObject({
			name: "ConversationSaveConflictError",
		});
		expect(state.updateValues).toHaveLength(3);
	});
});
