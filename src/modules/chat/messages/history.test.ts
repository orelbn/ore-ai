import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { normalizeConversationHistoryMessages } from "./history";

function userMessage(text: string): UIMessage {
	return {
		id: crypto.randomUUID(),
		role: "user",
		parts: [{ type: "text", text }],
	};
}

describe("conversation history normalization", () => {
	test("should drop system messages while preserving rich non-system message parts", () => {
		const user = userMessage("hello");
		const messages = normalizeConversationHistoryMessages([
			user,
			{
				id: "system-1",
				role: "system",
				parts: [{ type: "text", text: "system prompt" }],
			},
			{
				id: "assistant-1",
				role: "assistant",
				parts: [
					{ type: "reasoning", text: "internal only" },
					{ type: "text", text: "available later" },
				],
			},
			{
				id: "assistant-2",
				role: "assistant",
				parts: [{ type: "reasoning", text: "reasoning only" }],
			},
		]);

		expect(messages).toEqual([
			user,
			{
				id: "assistant-1",
				role: "assistant",
				parts: [
					{ type: "reasoning", text: "internal only" },
					{ type: "text", text: "available later" },
				],
			},
			{
				id: "assistant-2",
				role: "assistant",
				parts: [{ type: "reasoning", text: "reasoning only" }],
			},
		]);
	});
});
