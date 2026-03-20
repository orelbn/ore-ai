import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";
import { createServerGeneratedMessageMetadata } from "../server/message-integrity";
import {
	clearStoredConversation,
	persistConversation,
	readConversationForSession,
	readStoredConversation,
} from "./conversation-storage";

type StorageMap = Map<string, string>;

function createStorage(map: StorageMap): Storage {
	return {
		getItem: (key) => map.get(key) ?? null,
		setItem: (key, value) => {
			map.set(key, value);
		},
		removeItem: (key) => {
			map.delete(key);
		},
		clear: () => map.clear(),
		key: (index) => Array.from(map.keys())[index] ?? null,
		get length() {
			return map.size;
		},
	} satisfies Storage;
}

const storageMap: StorageMap = new Map();
const CONVERSATION_ID = "conversation-1";

beforeEach(() => {
	storageMap.clear();
	vi.stubGlobal("window", {
		sessionStorage: createStorage(storageMap),
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function textMessage(
	id: string,
	role: OreAgentUIMessage["role"],
	text: string,
) {
	return {
		id,
		role,
		parts: [{ type: "text", text }],
	} satisfies OreAgentUIMessage;
}

function assistantMessage(
	id: string,
	parts: OreAgentUIMessage["parts"],
	metadata?: OreAgentUIMessage["metadata"],
) {
	return {
		id,
		role: "assistant",
		parts,
		...(metadata ? { metadata } : {}),
	} satisfies OreAgentUIMessage;
}

describe("conversation storage", () => {
	test("should persist and hydrate stored messages when session storage is available", () => {
		persistConversation({
			conversationId: CONVERSATION_ID,
			messages: [textMessage("m-1", "user", "hello")],
		});

		expect(readStoredConversation()).toEqual({
			conversationId: CONVERSATION_ID,
			messages: [textMessage("m-1", "user", "hello")],
		});
	});

	test("should clear stored state when the persisted payload is invalid JSON", () => {
		storageMap.set("ore-ai:chat-session:v1", "{bad json");

		expect(readStoredConversation().messages).toEqual([]);
		expect(storageMap.has("ore-ai:chat-session:v1")).toBe(false);
	});

	test("should remove stored state when clearStoredConversation is called", () => {
		persistConversation({
			conversationId: CONVERSATION_ID,
			messages: [textMessage("m-1", "user", "hello")],
		});

		clearStoredConversation();

		expect(readStoredConversation().messages).toEqual([]);
	});

	test("should drop unsigned assistant history when stored messages are hydrated", () => {
		storageMap.set(
			"ore-ai:chat-session:v1",
			JSON.stringify({
				version: 1,
				conversationId: CONVERSATION_ID,
				messages: [
					textMessage("u-1", "user", "hello"),
					textMessage("a-1", "assistant", "unsigned"),
				],
			}),
		);

		expect(readStoredConversation()).toEqual({
			conversationId: CONVERSATION_ID,
			messages: [textMessage("u-1", "user", "hello")],
		});
	});

	test("should normalize signed assistant history before persisting it", () => {
		const assistantMetadata = createServerGeneratedMessageMetadata({
			message: {
				id: "a-1",
				role: "assistant",
				parts: [{ type: "text", text: "Hello from Ore" }],
			},
			conversationId: CONVERSATION_ID,
			secret: "history-secret",
		});

		persistConversation({
			conversationId: CONVERSATION_ID,
			messages: [
				textMessage("u-1", "user", "hello"),
				assistantMessage(
					"a-1",
					[
						{ type: "reasoning", text: "internal" },
						{ type: "text", text: "Hello from Ore" },
					],
					assistantMetadata,
				),
			],
		});

		expect(readStoredConversation()).toEqual({
			conversationId: CONVERSATION_ID,
			messages: [
				textMessage("u-1", "user", "hello"),
				{
					id: "a-1",
					role: "assistant",
					parts: [{ type: "text", text: "Hello from Ore" }],
					metadata: assistantMetadata,
				},
			],
		});
	});

	test("should return an empty conversation snapshot when storage reads throw", () => {
		vi.stubGlobal("window", {
			sessionStorage: {
				...createStorage(storageMap),
				getItem: () => {
					throw new Error("storage blocked");
				},
			} satisfies Storage,
		});

		expect(readStoredConversation().messages).toEqual([]);
	});

	test("should clear stored threads when there is no active session", () => {
		storageMap.set(
			"ore-ai:chat-session:v1",
			JSON.stringify({
				version: 1,
				conversationId: CONVERSATION_ID,
				messages: [textMessage("u-1", "user", "hello")],
			}),
		);

		expect(readConversationForSession(false).messages).toEqual([]);
		expect(storageMap.has("ore-ai:chat-session:v1")).toBe(false);
	});

	test("should hydrate stored threads when the session is still active", () => {
		persistConversation({
			conversationId: CONVERSATION_ID,
			messages: [textMessage("m-1", "user", "hello")],
		});

		expect(readConversationForSession(true)).toEqual({
			conversationId: CONVERSATION_ID,
			messages: [textMessage("m-1", "user", "hello")],
		});
	});
});
