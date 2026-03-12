import { afterEach, describe, expect, vi, test } from "vitest";
import { reportChatRouteError } from "./error-reporting";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("reportChatRouteError", () => {
	test("emits structured error payload with cloudflare metadata", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		reportChatRouteError({
			request: new Request("http://localhost", {
				headers: {
					"cf-ray": "8f22ee9988776655-SJC",
					"cf-ipcountry": "US",
				},
			}),
			requestId: "request-1",
			route: "/api/chat",
			stage: "handler",
			userId: "user-1",
			chatId: "chat-1",
			error: new Error("boom"),
		});

		expect(errorSpy).toHaveBeenCalledTimes(1);
		const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]));
		expect(payload).toMatchObject({
			scope: "chat_api",
			level: "error",
			route: "/api/chat",
			stage: "handler",
			requestId: "request-1",
			userId: "user-1",
			chatId: "chat-1",
			cfRay: "8f22ee9988776655-SJC",
			cfColo: "SJC",
			cfCountry: "US",
			error: "boom",
		});
	});

	test("handles unknown thrown values", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		reportChatRouteError({
			request: new Request("http://localhost"),
			requestId: "request-2",
			route: "/api/chat",
			stage: "handler",
			error: "non-error",
		});

		const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]));
		expect(payload.error).toBe("unknown");
		expect(payload.userId).toBeNull();
		expect(payload.chatId).toBeNull();
	});
});
