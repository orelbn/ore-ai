import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { createServerGeneratedMessageMetadata } from "../server/message-integrity";
import {
	normalizeConversationHistoryMessage,
	normalizeConversationHistoryMessages,
} from "./history";

function userMessage(text: string): UIMessage {
	return {
		id: crypto.randomUUID(),
		role: "user",
		parts: [{ type: "text", text }],
	};
}

describe("conversation history normalization", () => {
	test("should return user messages unchanged when the role is user", () => {
		const message = userMessage("hello");

		expect(normalizeConversationHistoryMessage(message)).toEqual(message);
	});

	test("should drop messages when the role is system", () => {
		expect(
			normalizeConversationHistoryMessage({
				id: "system-1",
				role: "system",
				parts: [{ type: "text", text: "system prompt" }],
			}),
		).toBeNull();
	});

	test("should keep only signed assistant text when assistant history includes reasoning parts", () => {
		const metadata = createServerGeneratedMessageMetadata({
			message: {
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", text: "Hello world" }],
			},
			conversationId: "conversation-1",
			secret: "history-secret",
		});

		expect(
			normalizeConversationHistoryMessage({
				id: "assistant-1",
				role: "assistant",
				parts: [
					{ type: "reasoning", text: "internal" },
					{ type: "text", text: "Hello world" },
				],
				metadata,
			}),
		).toEqual({
			id: "assistant-1",
			role: "assistant",
			parts: [{ type: "text", text: "Hello world" }],
			metadata,
		});
	});

	test("should omit assistant messages when signed text content is unavailable", () => {
		const messages = normalizeConversationHistoryMessages([
			userMessage("hello"),
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "reasoning", text: "internal only" }],
			},
			{
				id: "assistant-2",
				role: "assistant",
				parts: [{ type: "text", text: "unsigned" }],
			},
		]);

		expect(messages).toEqual([expect.objectContaining({ role: "user" })]);
	});
});
