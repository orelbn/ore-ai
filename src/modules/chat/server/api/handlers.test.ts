import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { UIMessage } from "ai";
import type { McpServiceBinding } from "@/services/mcp/types";

const state = vi.hoisted<{
	streamCalls: number;
	lastStreamInput: Record<string, unknown> | null;
	reportCalls: number;
	logCalls: number;
	accessResponse: Response | null;
	accessCalls: number;
	responseHeaders: Headers;
	env: {
		BETTER_AUTH_SECRET: string;
		GOOGLE_GENERATIVE_AI_API_KEY: string;
		MCP_INTERNAL_SHARED_SECRET: string;
		MCP_SERVER_URL: string;
		ORE_AI_MCP: McpServiceBinding;
	};
}>(() => ({
	streamCalls: 0,
	lastStreamInput: null,
	reportCalls: 0,
	logCalls: 0,
	accessResponse: null,
	accessCalls: 0,
	responseHeaders: new Headers(),
	env: {
		BETTER_AUTH_SECRET: "better-auth-secret",
		GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
		MCP_INTERNAL_SHARED_SECRET: "mcp-secret",
		MCP_SERVER_URL: "https://example.com/mcp",
		ORE_AI_MCP: {
			fetch: async () => new Response("ok"),
		},
	},
}));

vi.mock("cloudflare:workers", () => ({
	env: state.env,
}));

vi.mock("@/services/cloudflare", () => ({
	getCloudflareRequestMetadata: () => ({
		cfRay: null,
		cfColo: null,
		cfCountry: null,
	}),
}));

vi.mock("@/modules/session/server", () => ({
	resolveChatSessionAccess: async () => {
		state.accessCalls += 1;
		if (state.accessResponse) {
			return {
				ok: false as const,
				response: state.accessResponse,
			};
		}

		return {
			ok: true as const,
			responseHeaders: state.responseHeaders,
		};
	},
}));

vi.mock("../config/runtime-config", () => ({
	resolveChatRuntimeConfig: async () => ({
		mcpServerUrl: "https://example.com/mcp",
		agentSystemPrompt: "test prompt",
	}),
}));

vi.mock("../stream/assistant-stream", () => ({
	streamAssistantReply: async (input: Record<string, unknown>) => {
		state.streamCalls += 1;
		state.lastStreamInput = input;
		return new Response("ok", { status: 200 });
	},
}));

vi.mock("./request-guards", () => ({
	validateChatPostRequest: async () => ({
		conversationId: "conversation-1",
		messages: [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", text: "hello" }],
			},
		] satisfies UIMessage[],
	}),
	mapChatRequestErrorToResponse: (error: { status: number; message: string }) =>
		Response.json({ error: error.message }, { status: error.status }),
}));

vi.mock("./error-reporting", () => ({
	reportChatRouteError: () => {
		state.reportCalls += 1;
	},
}));

vi.mock("./logging", () => ({
	logChatApiEvent: () => {
		state.logCalls += 1;
	},
}));

let handlePostChat: typeof import("./handlers").handlePostChat;

beforeAll(async () => {
	({ handlePostChat } = await import("./handlers"));
});

beforeEach(() => {
	state.streamCalls = 0;
	state.lastStreamInput = null;
	state.reportCalls = 0;
	state.logCalls = 0;
	state.accessResponse = null;
	state.accessCalls = 0;
	state.responseHeaders = new Headers();
	state.env.BETTER_AUTH_SECRET = "better-auth-secret";
	state.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-key";
	state.env.MCP_INTERNAL_SHARED_SECRET = "mcp-secret";
});

describe("handlePostChat", () => {
	test("should block unauthenticated chat requests before model execution", async () => {
		state.accessResponse = Response.json(
			{ error: "Session access required." },
			{ status: 401 },
		);

		const response = await handlePostChat(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: JSON.stringify({ messages: [] }),
			}),
		);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "Session access required.",
		});
		expect(state.accessCalls).toBe(1);
		expect(state.streamCalls).toBe(0);
		expect(state.reportCalls).toBe(0);
		expect(state.logCalls).toBe(1);
	});

	test("should forward cookies on successful chat responses", async () => {
		state.responseHeaders = new Headers({
			"set-cookie": "ore_ai.session=anon",
		});

		const response = await handlePostChat(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: JSON.stringify({
					conversationId: "conversation-1",
					messages: [
						{
							id: "user-1",
							role: "user",
							parts: [{ type: "text", text: "hello" }],
						},
					],
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("set-cookie")).toBe("ore_ai.session=anon");
		expect(state.accessCalls).toBe(1);
		expect(state.streamCalls).toBe(1);
		expect(state.lastStreamInput).not.toHaveProperty("sessionBindingId");
		expect(state.reportCalls).toBe(0);
		expect(state.logCalls).toBe(1);
	});
});
