import { beforeEach, describe, expect, test, vi } from "vitest";
import { SESSION_RESET_RESPONSE_HEADER } from "../constants";
import { resolveChatSessionAccess } from "./chat-access";

const state = vi.hoisted<{
	getSessionCalls: number;
	getSessionResult: { session: { id: string }; user: { id: string } } | null;
}>(() => ({
	getSessionCalls: 0,
	getSessionResult: null,
}));

vi.mock("@/services/auth", () => ({
	auth: {
		api: {
			getSession: async () => {
				state.getSessionCalls += 1;
				return state.getSessionResult;
			},
		},
	},
}));

beforeEach(() => {
	state.getSessionCalls = 0;
	state.getSessionResult = null;
});

function createSameOriginChatRequest(
	body?: Record<string, unknown>,
	headers?: HeadersInit,
) {
	return new Request("https://oreai.orelbn.ca/api/chat", {
		method: "POST",
		headers: {
			origin: "https://oreai.orelbn.ca",
			"sec-fetch-site": "same-origin",
			...headers,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
}

describe("resolveChatSessionAccess", () => {
	test("should reject cross-site post requests before session checks run", async () => {
		const result = await resolveChatSessionAccess({
			request: new Request("https://oreai.orelbn.ca/api/chat", {
				method: "POST",
				headers: {
					origin: "https://attacker.example",
					"sec-fetch-site": "cross-site",
				},
			}),
		});

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("Expected a blocked response");
		expect(result.response.status).toBe(403);
		await expect(result.response.json()).resolves.toEqual({
			error: "Invalid request.",
		});
		expect(state.getSessionCalls).toBe(0);
	});

	test("should allow chat immediately when the auth session is still active", async () => {
		state.getSessionResult = {
			session: { id: "session-1" },
			user: { id: "user-1" },
		};

		const result = await resolveChatSessionAccess({
			request: createSameOriginChatRequest({
				conversationId: "conversation-1",
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
				],
			}),
		});

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("Expected an allowed response");
		expect(result.userId).toBe("user-1");
	});

	test("should reject chat when there is no active auth session", async () => {
		const result = await resolveChatSessionAccess({
			request: createSameOriginChatRequest({
				conversationId: "conversation-1",
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
				],
			}),
		});

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("Expected a blocked response");
		expect(result.response.status).toBe(401);
		await expect(result.response.json()).resolves.toEqual({
			error: "Session access required.",
		});
		expect(
			result.response.headers.get(SESSION_RESET_RESPONSE_HEADER),
		).toBeNull();
	});

	test("should request a fresh start when the client expected an active session but auth is unusable", async () => {
		const result = await resolveChatSessionAccess({
			request: createSameOriginChatRequest(
				{
					conversationId: "conversation-1",
					messages: [
						{
							id: "user-1",
							role: "user",
							parts: [{ type: "text", text: "hello" }],
						},
					],
				},
				{ "x-ore-active-session": "true" },
			),
		});

		expect(result.ok).toBe(false);
		if (result.ok) throw new Error("Expected a blocked response");
		expect(result.response.status).toBe(401);
		expect(result.response.headers.get(SESSION_RESET_RESPONSE_HEADER)).toBe(
			"true",
		);
		await expect(result.response.json()).resolves.toEqual({
			error:
				"We couldn't keep your chat session active. Restarting chat is required.",
		});
	});
});
