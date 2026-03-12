import { afterEach, describe, expect, vi, test } from "vitest";
import { getPersistedMessageId } from "./persisted-message-id";

describe("getPersistedMessageId", () => {
	afterEach(() => {
		vi.restoreAllMocks();
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
		const randomUUID = vi
			.spyOn(crypto, "randomUUID")
			.mockReturnValue("00000000-0000-4000-8000-000000000000");

		const id = getPersistedMessageId({
			messageId: "   ",
			sessionId: "session-7",
			role: "user",
			index: 3,
		});

		expect(id).toBe("session-7:user:3:00000000-0000-4000-8000-000000000000");
		expect(randomUUID).toHaveBeenCalledTimes(1);
	});
});
