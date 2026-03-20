import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import type { ConversationMessage } from "../../types";

const state: {
	createStreamCalls: number;
	closeCalls: number;
	lastStreamInput: Record<string, unknown> | null;
	persistedMessages: ConversationMessage[] | null;
} = {
	createStreamCalls: 0,
	closeCalls: 0,
	lastStreamInput: null,
	persistedMessages: null,
};

vi.mock("ai", () => ({
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
	state.createStreamCalls = 0;
	state.closeCalls = 0;
	state.lastStreamInput = null;
	state.persistedMessages = null;
	vi.restoreAllMocks();
});

function textMessage(
	id: string,
	role: ConversationMessage["role"],
	text: string,
): ConversationMessage {
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

function isOnFinish(
	value: unknown,
): value is (event: { messages: ConversationMessage[] }) => Promise<void> {
	return typeof value === "function";
}

describe("streamAssistantReply", () => {
	test("should persist completed messages and close MCP tools when the stream finishes", async () => {
		const messages = [textMessage("u-1", "user", "hello")];
		const response = await streamAssistantReply({
			requestId: "request-2",
			agentOptions: { googleApiKey: "test-key" },
			messages,
			actorId: "user-1",
			mcpServiceBinding: {
				fetch: async () => new Response("ok"),
			},
			mcpInternalSecret: "secret",
			mcpServerUrl: "https://example.com/mcp",
			onFinishMessages: async (messages) => {
				state.persistedMessages = messages;
			},
			resolveMcpTools: async () => ({
				tools: {},
				close: async () => {
					state.closeCalls += 1;
				},
			}),
		});

		expect(response.status).toBe(200);
		expect(state.createStreamCalls).toBe(1);
		expect(getLastStreamInput()).toMatchObject({
			uiMessages: messages,
			originalMessages: messages,
		});
		const onFinish = getLastStreamInput().onFinish;
		expect(isOnFinish(onFinish)).toBe(true);
		if (!isOnFinish(onFinish)) {
			throw new Error(
				"Expected the stream response to expose an onFinish hook",
			);
		}

		const completedMessages = [
			textMessage("u-1", "user", "hello"),
			textMessage("a-1", "assistant", "hi"),
		];
		await onFinish({ messages: completedMessages });

		expect(state.persistedMessages).toEqual(completedMessages);
		expect(state.closeCalls).toBe(1);
	});
});
