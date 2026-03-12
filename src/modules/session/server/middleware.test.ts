import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	chatSessionAccessRouteMiddleware,
	runChatSessionAccessCheck,
} from "./middleware";

const state = vi.hoisted(() => ({
	accessResponse: null as Response | null,
	accessCalls: 0,
}));

vi.mock("./chat-access", () => ({
	enforceChatSessionAccess: async () => {
		state.accessCalls += 1;
		return state.accessResponse;
	},
}));

beforeEach(() => {
	state.accessResponse = null;
	state.accessCalls = 0;
});

describe("session access middleware", () => {
	test("should skip non-post requests", async () => {
		const response = await runChatSessionAccessCheck({
			request: new Request("http://localhost/api/chat"),
		});

		expect(response).toBeNull();
		expect(state.accessCalls).toBe(0);
	});

	test("should return the session access response for protected chat requests", async () => {
		state.accessResponse = Response.json(
			{ error: "Session access required." },
			{ status: 401 },
		);

		const response = await runChatSessionAccessCheck({
			request: new Request("http://localhost/api/chat", {
				method: "POST",
			}),
		});

		expect(response?.status).toBe(401);
		expect(state.accessCalls).toBe(1);
	});

	test("should return the rate-limit response after session access passes", async () => {
		state.accessResponse = Response.json(
			{
				error: "Too many requests. Please try again later.",
				retryAfterSeconds: 60,
			},
			{
				status: 429,
				headers: {
					"Retry-After": "60",
				},
			},
		);

		const response = await runChatSessionAccessCheck({
			request: new Request("http://localhost/api/chat", {
				method: "POST",
			}),
		});

		expect(response?.status).toBe(429);
		expect(response?.headers.get("Retry-After")).toBe("60");
		expect(state.accessCalls).toBe(1);
	});

	test("route middleware short-circuits blocked requests", async () => {
		state.accessResponse = Response.json(
			{ error: "Session access required." },
			{ status: 401 },
		);
		const next = vi.fn();

		const result = await chatSessionAccessRouteMiddleware.options.server?.({
			request: new Request("http://localhost/api/chat", {
				method: "POST",
			}),
			pathname: "/api/chat",
			context: undefined,
			next: next as never,
		});

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
		expect(next).not.toHaveBeenCalled();
	});

	test("route middleware calls next for allowed requests", async () => {
		const next = vi.fn(async () => ({
			request: new Request("http://localhost/api/chat", {
				method: "POST",
			}),
			pathname: "/api/chat",
			context: undefined,
			response: new Response(null, { status: 204 }),
		}));

		const result = await chatSessionAccessRouteMiddleware.options.server?.({
			request: new Request("http://localhost/api/chat", {
				method: "POST",
			}),
			pathname: "/api/chat",
			context: undefined,
			next: next as never,
		});

		expect(next).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({
			response: expect.objectContaining({ status: 204 }),
		});
	});
});
