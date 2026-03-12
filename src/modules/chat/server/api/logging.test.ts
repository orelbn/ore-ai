import { afterEach, describe, expect, vi, test } from "vitest";
import { logChatApiEvent } from "./logging";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("logChatApiEvent", () => {
	test("emits a structured info event", () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		logChatApiEvent({
			requestId: "request-1",
			route: "/api/chat",
			status: 200,
			durationMs: 34,
			userId: "user-1",
			chatId: "chat-1",
			rateLimited: false,
			cfRay: "ray",
			cfColo: "SJC",
			cfCountry: "US",
		});

		expect(infoSpy).toHaveBeenCalledTimes(1);
		const payload = JSON.parse(String(infoSpy.mock.calls[0]?.[0]));
		expect(payload).toMatchObject({
			scope: "chat_api",
			requestId: "request-1",
			route: "/api/chat",
			status: 200,
			durationMs: 34,
			userId: "user-1",
			chatId: "chat-1",
			rateLimited: false,
			cfRay: "ray",
			cfColo: "SJC",
			cfCountry: "US",
		});
	});
});
