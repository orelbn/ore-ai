import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { UIMessage } from "ai";
import type { McpServiceBinding } from "@/services/mcp/types";
import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";

const state = vi.hoisted<{
	streamCalls: number;
	lastStreamInput: Record<string, unknown> | null;
	reportCalls: number;
	logCalls: number;
	getSessionCalls: number;
	getSessionResult: { user: { id: string } } | null;
	loadConversationCalls: number;
	saveConversationCalls: Array<{
		userId: string;
		conversationId: string;
		messages: OreAgentUIMessage[];
	}>;
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
	getSessionCalls: 0,
	getSessionResult: { user: { id: "user-1" } },
	loadConversationCalls: 0,
	saveConversationCalls: [],
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

vi.mock("@/lib/security/request-provenance", () => ({
	hasTrustedPostRequestProvenance: () => true,
	buildUntrustedRequestResponse: () =>
		Response.json({ error: "Invalid request." }, { status: 403 }),
}));

vi.mock("@/modules/chat/repo/conversations", () => ({
	loadConversationForUser: async () => {
		state.loadConversationCalls += 1;
		return {
			conversationId: "conversation-1",
			messages: [
				{
					id: "previous-user",
					role: "user",
					parts: [{ type: "text", text: "previous" }],
				},
			] satisfies OreAgentUIMessage[],
		};
	},
	saveConversationForUser: async (input: {
		userId: string;
		conversationId: string;
		messages: OreAgentUIMessage[];
	}) => {
		state.saveConversationCalls.push(input);
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
		message: {
			id: "user-1",
			role: "user",
			parts: [{ type: "text", text: "hello" }],
		} satisfies UIMessage,
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
	state.getSessionCalls = 0;
	state.getSessionResult = { user: { id: "user-1" } };
	state.loadConversationCalls = 0;
	state.saveConversationCalls = [];
	state.env.BETTER_AUTH_SECRET = "better-auth-secret";
	state.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-key";
	state.env.MCP_INTERNAL_SHARED_SECRET = "mcp-secret";
});

describe("handlePostChat", () => {
	test("should block unauthenticated chat requests before model execution", async () => {
		state.getSessionResult = null;

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
		expect(state.getSessionCalls).toBe(1);
		expect(state.loadConversationCalls).toBe(0);
		expect(state.streamCalls).toBe(0);
		expect(state.reportCalls).toBe(0);
		expect(state.logCalls).toBe(1);
	});

	test("should return successful chat responses after session access succeeds", async () => {
		const response = await handlePostChat(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: JSON.stringify({
					conversationId: "conversation-1",
					message: {
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(state.getSessionCalls).toBe(1);
		expect(state.loadConversationCalls).toBe(1);
		expect(state.streamCalls).toBe(1);
		expect(state.lastStreamInput).toMatchObject({
			actorId: "user-1",
			messages: [
				expect.objectContaining({ id: "previous-user" }),
				expect.objectContaining({ id: "user-1" }),
			],
		});
		const onFinishMessages = state.lastStreamInput?.onFinishMessages;
		expect(typeof onFinishMessages).toBe("function");
		if (typeof onFinishMessages !== "function") {
			throw new Error("Expected stream input to expose onFinishMessages");
		}
		await onFinishMessages([
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", text: "hello" }],
			},
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", text: "hi" }],
			},
		]);
		expect(state.saveConversationCalls).toEqual([
			{
				userId: "user-1",
				conversationId: "conversation-1",
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
					{
						id: "assistant-1",
						role: "assistant",
						parts: [{ type: "text", text: "hi" }],
					},
				],
			},
		]);
		expect(state.reportCalls).toBe(0);
		expect(state.logCalls).toBe(1);
	});
});
