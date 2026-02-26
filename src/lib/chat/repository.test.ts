import { describe, expect, test } from "bun:test";
import { getPersistedMessageId } from "./persisted-message-id";

describe("getPersistedMessageId", () => {
	test("returns original id when present", () => {
		const id = getPersistedMessageId({
			messageId: "msg-123",
			sessionId: "session-1",
			role: "assistant",
			index: 0,
		});

		expect(id).toBe("msg-123");
	});

	test("generates unique id when message id is empty", () => {
		const id = getPersistedMessageId({
			messageId: "   ",
			sessionId: "session-2",
			role: "assistant",
			index: 3,
		});

		expect(id.startsWith("session-2:assistant:3:")).toBe(true);
		expect(id.length).toBeGreaterThan("session-2:assistant:3:".length);
	});
});
