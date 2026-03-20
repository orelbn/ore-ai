import { describe, expect, test } from "vitest";
import { hydrateInitialConversationSeed } from "./-index.hydration";

describe("hydrateInitialConversationSeed", () => {
	test("should keep the conversation id and valid hydrated messages", () => {
		expect(
			hydrateInitialConversationSeed(
				JSON.stringify({
					conversationId: "conversation-1",
					messages: [
						{
							id: "assistant-1",
							role: "assistant",
							parts: [{ type: "text", text: "hello" }],
						},
						{ nope: true },
					],
				}),
			),
		).toEqual({
			conversationId: "conversation-1",
			messages: [
				{
					id: "assistant-1",
					role: "assistant",
					parts: [{ type: "text", text: "hello" }],
				},
			],
		});
	});

	test("should fall back to an empty conversation seed for malformed payloads", () => {
		const hydrated = hydrateInitialConversationSeed("{not-json");

		expect(hydrated.messages).toEqual([]);
		expect(typeof hydrated.conversationId).toBe("string");
		expect(hydrated.conversationId).not.toHaveLength(0);
	});
});
