import { describe, expect, test } from "bun:test";
import type { UIMessage } from "ai";
import { selectAssistantMessagesForCurrentTurn } from "./assistant-stream";

function textMessage(
	id: string,
	role: UIMessage["role"],
	text: string,
): UIMessage {
	return {
		id,
		role,
		parts: [{ type: "text", text }],
	};
}

describe("selectAssistantMessagesForCurrentTurn", () => {
	test("selects only assistant messages generated after the current user message", () => {
		const allMessages: UIMessage[] = [
			textMessage("u-1", "user", "old q"),
			textMessage("a-1", "assistant", "old a"),
			textMessage("u-2", "user", "current q"),
			textMessage("a-2", "assistant", "current a"),
		];

		const selected = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "u-2",
			knownMessageIds: new Set(["u-1", "a-1", "u-2"]),
		});

		expect(selected).toEqual([textMessage("a-2", "assistant", "current a")]);
	});

	test("falls back safely when request message id is not found", () => {
		const allMessages: UIMessage[] = [
			textMessage("u-1", "user", "q"),
			textMessage("a-1", "assistant", "existing"),
			textMessage("a-2", "assistant", "new"),
		];

		const selected = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "u-missing",
			knownMessageIds: new Set(["u-1", "a-1"]),
		});

		expect(selected).toEqual([textMessage("a-2", "assistant", "new")]);
	});

	test("uses the last user message boundary when request id is missing", () => {
		const allMessages: UIMessage[] = [
			textMessage("u-1", "user", "old q"),
			textMessage("a-1", "assistant", "old a"),
			textMessage("u-2", "user", "latest q"),
			textMessage("a-2", "assistant", "latest a"),
		];

		const selected = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "unknown",
			knownMessageIds: new Set(["u-1", "a-1", "u-2"]),
		});

		expect(selected).toEqual([textMessage("a-2", "assistant", "latest a")]);
	});

	test("deduplicates duplicate assistant message ids", () => {
		const allMessages: UIMessage[] = [
			textMessage("u-2", "user", "current q"),
			textMessage("a-2", "assistant", "current a"),
			textMessage("a-2", "assistant", "current a duplicate"),
		];

		const selected = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "u-2",
			knownMessageIds: new Set(["u-2"]),
		});

		expect(selected).toHaveLength(1);
		expect(selected[0].id).toBe("a-2");
	});

	test("skips assistant messages that have no parts", () => {
		const allMessages: UIMessage[] = [
			textMessage("u-2", "user", "current q"),
			{
				id: "a-empty",
				role: "assistant",
				parts: [],
			},
			textMessage("a-2", "assistant", "current a"),
		];

		const selected = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "u-2",
			knownMessageIds: new Set(["u-2"]),
		});

		expect(selected).toEqual([textMessage("a-2", "assistant", "current a")]);
	});
});
