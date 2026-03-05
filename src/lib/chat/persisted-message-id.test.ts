import { afterEach, describe, expect, mock, test } from "bun:test";
import { getPersistedMessageId } from "./persisted-message-id";

describe("getPersistedMessageId", () => {
	afterEach(() => {
		mock.restore();
	});

	test("returns trimmed existing message id", () => {
		const id = getPersistedMessageId({
			messageId: "  message-123  ",
			sessionId: "session-1",
			role: "assistant",
			index: 0,
		});

		expect(id).toBe("message-123");
	});

	test("generates session-scoped id when message id is empty", () => {
		const randomUUID = mock(() => "uuid-fixed");
		Object.defineProperty(crypto, "randomUUID", {
			value: randomUUID,
			configurable: true,
		});

		const id = getPersistedMessageId({
			messageId: "   ",
			sessionId: "session-7",
			role: "user",
			index: 3,
		});

		expect(id).toBe("session-7:user:3:uuid-fixed");
		expect(randomUUID).toHaveBeenCalledTimes(1);
	});
});
