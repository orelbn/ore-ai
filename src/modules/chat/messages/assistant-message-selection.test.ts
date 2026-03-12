import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";
import { selectAssistantMessagesForCurrentTurn } from "./assistant-message-selection";

function textMessage(
	id: string,
	role: UIMessage["role"],
	text: string,
): UIMessage {
	return { id, role, parts: [{ type: "text", text }] };
}

describe("selectAssistantMessagesForCurrentTurn", () => {
	test("selects assistant messages after the request message", () => {
		const allMessages: UIMessage[] = [
			textMessage("u-1", "user", "old"),
			textMessage("a-1", "assistant", "old response"),
			textMessage("u-2", "user", "current"),
			textMessage("a-2", "assistant", "new response"),
		];

		const result = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "u-2",
			knownMessageIds: new Set(["u-1", "a-1", "u-2"]),
		});

		expect(result).toEqual([textMessage("a-2", "assistant", "new response")]);
	});

	test("falls back to last user message when request id is missing", () => {
		const allMessages: UIMessage[] = [
			textMessage("u-1", "user", "first"),
			textMessage("a-1", "assistant", "first response"),
			textMessage("u-2", "user", "second"),
			textMessage("a-2", "assistant", "second response"),
		];

		const result = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "missing",
			knownMessageIds: new Set(["u-1", "a-1", "u-2"]),
		});

		expect(result).toEqual([
			textMessage("a-2", "assistant", "second response"),
		]);
	});

	test("returns only new assistant messages and drops duplicates/invalids", () => {
		const allMessages: UIMessage[] = [
			textMessage("u-1", "user", "hello"),
			textMessage("a-1", "assistant", "known"),
			{ id: "a-empty", role: "assistant", parts: [] },
			textMessage("a-2", "assistant", "new"),
			textMessage("a-2", "assistant", "duplicate"),
			textMessage("u-2", "user", "not assistant"),
		];

		const result = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "u-1",
			knownMessageIds: new Set(["u-1", "a-1"]),
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("a-2");
		expect(result[0]?.parts).toEqual([{ type: "text", text: "new" }]);
	});

	test("uses full message list when there is no user boundary", () => {
		const allMessages: UIMessage[] = [
			textMessage("a-1", "assistant", "first"),
			textMessage("a-2", "assistant", "second"),
		];

		const result = selectAssistantMessagesForCurrentTurn({
			allMessages,
			requestMessageId: "missing",
			knownMessageIds: new Set(["a-1"]),
		});

		expect(result).toEqual([textMessage("a-2", "assistant", "second")]);
	});
});
