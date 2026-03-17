import type { ToolSet, UIMessage } from "ai";
import { afterEach, beforeAll, describe, expect, vi, test } from "vitest";
import type { OreAiMcpServiceBinding } from "@/services/mcp/ore-ai-mcp-tools";
import { createServerGeneratedMessageMetadata } from "../message-integrity";

const state: {
	validateCalls: Array<{ messages: UIMessage[] }>;
	createStreamCalls: number;
	closeCalls: number;
	lastStreamInput: Record<string, unknown> | null;
} = {
	validateCalls: [],
	createStreamCalls: 0,
	closeCalls: 0,
	lastStreamInput: null,
};

vi.mock("ai", () => ({
	validateUIMessages: async (input: { messages: UIMessage[] }) => {
		state.validateCalls.push(input);
		return input.messages;
	},
	createAgentUIStreamResponse: (input: unknown) => {
		state.createStreamCalls += 1;
		state.lastStreamInput = input as Record<string, unknown>;
		return new Response("stream", { status: 200 });
	},
}));

vi.mock("@/services/google-ai/ore-agent", () => ({
	createOreAgent: () => ({ type: "mock-agent" }),
}));

let streamAssistantReply: typeof import("./assistant-stream").streamAssistantReply;

beforeAll(async () => {
	({ streamAssistantReply } = await import("./assistant-stream"));
});

afterEach(() => {
	state.validateCalls = [];
	state.createStreamCalls = 0;
	state.closeCalls = 0;
	state.lastStreamInput = null;
	vi.restoreAllMocks();
});

function textMessage(
	id: string,
	role: UIMessage["role"],
	text: string,
): UIMessage {
	return { id, role, parts: [{ type: "text", text }] };
}

function getLastStreamInput(): Record<string, unknown> {
	if (!state.lastStreamInput) {
		throw new Error(
			"Expected createAgentUIStreamResponse to receive stream options",
		);
	}

	return state.lastStreamInput;
}

function isGenerateMessageId(value: unknown): value is () => string {
	return typeof value === "function";
}

function isOnFinish(value: unknown): value is () => Promise<void> {
	return typeof value === "function";
}

function isMessageMetadata(
	value: unknown,
): value is (input: { part: Record<string, unknown> }) => unknown {
	return typeof value === "function";
}

describe("streamAssistantReply", () => {
	test("should validate incoming messages when creating the stream response", async () => {
		const mcpServiceBinding: OreAiMcpServiceBinding = {
			fetch: async () => new Response("ok"),
		};
		const tools: ToolSet = {};
		const response = await streamAssistantReply({
			requestId: "request-1",
			agentOptions: { googleApiKey: "test-key" },
			conversationId: "conversation-1",
			messages: [
				textMessage("u-1", "user", "hello"),
				textMessage("a-1", "assistant", "hi"),
			],
			actorId: "request-1",
			mcpServiceBinding,
			mcpInternalSecret: "secret",
			mcpServerUrl: "https://example.com/mcp",
			messageIntegritySecret: "history-secret",
			sessionBindingId: "session-binding-1",
			resolveMcpTools: async () => ({
				tools,
				close: async () => {
					state.closeCalls += 1;
				},
			}),
		});

		expect(response.status).toBe(200);
		expect(state.validateCalls).toHaveLength(1);
		expect(state.validateCalls[0]?.messages).toHaveLength(2);
		expect(state.createStreamCalls).toBe(1);
	});

	test("should close resolved MCP tools when the stream finishes", async () => {
		const response = await streamAssistantReply({
			requestId: "request-2",
			agentOptions: { googleApiKey: "test-key" },
			conversationId: "conversation-1",
			messages: [textMessage("u-1", "user", "hello")],
			actorId: "request-2",
			mcpServiceBinding: {
				fetch: async () => new Response("ok"),
			},
			mcpInternalSecret: "secret",
			mcpServerUrl: "https://example.com/mcp",
			messageIntegritySecret: "history-secret",
			sessionBindingId: "session-binding-1",
			resolveMcpTools: async () => ({
				tools: {},
				close: async () => {
					state.closeCalls += 1;
				},
			}),
		});

		expect(response.status).toBe(200);
		const onFinish = getLastStreamInput().onFinish;
		expect(isOnFinish(onFinish)).toBe(true);
		if (!isOnFinish(onFinish)) {
			throw new Error(
				"Expected the stream response to expose an onFinish hook",
			);
		}

		await onFinish();

		expect(state.closeCalls).toBe(1);
	});

	test("should attach signed assistant metadata when streamed text finishes", async () => {
		const response = await streamAssistantReply({
			requestId: "request-3",
			agentOptions: { googleApiKey: "test-key" },
			conversationId: "conversation-1",
			messages: [textMessage("u-1", "user", "hello")],
			actorId: "request-3",
			mcpServiceBinding: {
				fetch: async () => new Response("ok"),
			},
			mcpInternalSecret: "secret",
			mcpServerUrl: "https://example.com/mcp",
			messageIntegritySecret: "history-secret",
			sessionBindingId: "session-binding-1",
			resolveMcpTools: async () => ({
				tools: {},
				close: async () => {
					state.closeCalls += 1;
				},
			}),
		});

		expect(response.status).toBe(200);
		const streamInput = getLastStreamInput();
		const generateMessageId = streamInput.generateMessageId;
		const messageMetadata = streamInput.messageMetadata;
		expect(isGenerateMessageId(generateMessageId)).toBe(true);
		expect(isMessageMetadata(messageMetadata)).toBe(true);
		if (
			!isGenerateMessageId(generateMessageId) ||
			!isMessageMetadata(messageMetadata)
		) {
			throw new Error(
				"Expected stream options to include assistant metadata signing",
			);
		}

		const messageId = generateMessageId();
		messageMetadata({
			part: { type: "text-start", id: "text-1" },
		});
		messageMetadata({
			part: { type: "text-delta", id: "text-1", text: "Signed response" },
		});
		messageMetadata({
			part: { type: "text-end", id: "text-1" },
		});
		const metadata = messageMetadata({
			part: { type: "finish" },
		});

		expect(metadata).toEqual(
			createServerGeneratedMessageMetadata({
				message: {
					id: messageId,
					role: "assistant",
					parts: [{ type: "text", text: "Signed response" }],
				},
				conversationId: "conversation-1",
				secret: "history-secret",
				sessionBindingId: "session-binding-1",
			}),
		);
	});

	test("should sign the normalized replay text when one assistant message has multiple text blocks", async () => {
		const response = await streamAssistantReply({
			requestId: "request-4",
			agentOptions: { googleApiKey: "test-key" },
			conversationId: "conversation-1",
			messages: [textMessage("u-1", "user", "hello")],
			actorId: "request-4",
			mcpServiceBinding: {
				fetch: async () => new Response("ok"),
			},
			mcpInternalSecret: "secret",
			mcpServerUrl: "https://example.com/mcp",
			messageIntegritySecret: "history-secret",
			sessionBindingId: "session-binding-1",
			resolveMcpTools: async () => ({
				tools: {},
				close: async () => {
					state.closeCalls += 1;
				},
			}),
		});

		expect(response.status).toBe(200);
		const streamInput = getLastStreamInput();
		const generateMessageId = streamInput.generateMessageId;
		const messageMetadata = streamInput.messageMetadata;
		expect(isGenerateMessageId(generateMessageId)).toBe(true);
		expect(isMessageMetadata(messageMetadata)).toBe(true);
		if (
			!isGenerateMessageId(generateMessageId) ||
			!isMessageMetadata(messageMetadata)
		) {
			throw new Error(
				"Expected stream options to include assistant metadata signing",
			);
		}

		const messageId = generateMessageId();
		messageMetadata({
			part: { type: "text-start", id: "text-1" },
		});
		messageMetadata({
			part: { type: "text-delta", id: "text-1", text: "First block" },
		});
		messageMetadata({
			part: { type: "text-end", id: "text-1" },
		});
		messageMetadata({
			part: { type: "text-start", id: "text-2" },
		});
		messageMetadata({
			part: { type: "text-delta", id: "text-2", text: "Second block" },
		});
		messageMetadata({
			part: { type: "text-end", id: "text-2" },
		});
		const metadata = messageMetadata({
			part: { type: "finish" },
		});

		expect(metadata).toEqual(
			createServerGeneratedMessageMetadata({
				message: {
					id: messageId,
					role: "assistant",
					parts: [{ type: "text", text: "First block\nSecond block" }],
				},
				conversationId: "conversation-1",
				secret: "history-secret",
				sessionBindingId: "session-binding-1",
			}),
		);
	});
});
