import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
	latestConversation: null as {
		conversationId: string;
		messages: Array<{
			id: string;
			role: "user";
			parts: [{ type: "text"; text: string }];
		}>;
	} | null,
}));

vi.mock("../repo/conversations", () => ({
	createEmptyConversationRecord: (conversationId?: string) => ({
		conversationId: conversationId ?? "generated-conversation",
		messages: [],
	}),
	loadLatestConversationForUser: async () => state.latestConversation,
}));

let createEmptyConversationSeed: typeof import("./conversation-seed").createEmptyConversationSeed;
let loadLatestConversationSeed: typeof import("./conversation-seed").loadLatestConversationSeed;

beforeAll(async () => {
	({ createEmptyConversationSeed, loadLatestConversationSeed } = await import(
		"./conversation-seed"
	));
});

beforeEach(() => {
	state.latestConversation = null;
});

describe("conversation seed helpers", () => {
	test("should create an empty seed with the provided conversation id", () => {
		expect(createEmptyConversationSeed("conversation-1")).toEqual({
			conversationId: "conversation-1",
			messages: [],
		});
	});

	test("should return the latest persisted conversation when one exists", async () => {
		state.latestConversation = {
			conversationId: "conversation-1",
			messages: [
				{
					id: "user-1",
					role: "user",
					parts: [{ type: "text", text: "hello" }],
				},
			],
		};

		await expect(loadLatestConversationSeed("user-1")).resolves.toEqual(
			state.latestConversation,
		);
	});

	test("should fall back to an empty seed when the user has no saved conversation", async () => {
		await expect(loadLatestConversationSeed("user-1")).resolves.toEqual({
			conversationId: "generated-conversation",
			messages: [],
		});
	});
});
