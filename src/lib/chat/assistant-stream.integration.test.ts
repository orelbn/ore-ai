import type { ToolSet, UIMessage } from "ai";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	mock,
	test,
} from "bun:test";

const state = {
	sessions: [] as Array<{ id: string; userId: string; title: string }>,
	messagesBySession: new Map<
		string,
		Array<{ id: string; role: string; partsJson: string }>
	>(),
	lastActivity: [] as Array<{
		chatId: string;
		userId: string;
		lastMessagePreview: string;
	}>,
	recentQueryArgs: [] as Array<{
		chatId: string;
		userId: string;
		limit: number;
	}>,
	validateCalls: [] as Array<{ messages: UIMessage[] }>,
	createStreamCalls: 0,
	capturedOnFinish: null as
		| null
		| ((input: { messages: UIMessage[] }) => Promise<void>),
	closeCalls: 0,
};

function resetState() {
	state.sessions = [];
	state.messagesBySession = new Map();
	state.lastActivity = [];
	state.recentQueryArgs = [];
	state.validateCalls = [];
	state.createStreamCalls = 0;
	state.capturedOnFinish = null;
	state.closeCalls = 0;
}

mock.module("@/db/query", () => ({
	insertChatSession: async (input: {
		id: string;
		userId: string;
		title: string;
	}) => {
		state.sessions.push(input);
	},
	queryRecentChatMessagesForUser: async (input: {
		chatId: string;
		userId: string;
		limit: number;
	}) => {
		state.recentQueryArgs.push(input);
		const rows = state.messagesBySession.get(input.chatId) ?? [];
		return rows.slice(-input.limit).reverse();
	},
	insertChatMessages: async (
		rows: Array<{
			id: string;
			sessionId: string;
			role: string;
			partsJson: string;
		}>,
	) => {
		for (const row of rows) {
			const current = state.messagesBySession.get(row.sessionId) ?? [];
			current.push({ id: row.id, role: row.role, partsJson: row.partsJson });
			state.messagesBySession.set(row.sessionId, current);
		}
	},
	updateChatSessionActivity: async (input: {
		chatId: string;
		userId: string;
		lastMessagePreview: string;
	}) => {
		state.lastActivity.push(input);
	},
	queryChatMessagesForUser: async () => [],
	queryChatSessionForUser: async () => null,
	queryChatSessionOwner: async () => null,
	queryChatSummariesByUser: async () => [],
	deleteChatSessionForUser: async () => {},
	queryUserMessageCountSince: async () => 0,
	queryIpMessageCountSince: async () => 0,
}));

mock.module("@/lib/agents/ore-agent", () => ({
	createOreAgent: () => ({ type: "mock-agent" }),
}));

mock.module("ai", () => ({
	validateUIMessages: async (input: { messages: UIMessage[] }) => {
		state.validateCalls.push(input);
		return input.messages;
	},
	createAgentUIStreamResponse: (input: {
		onFinish: (result: { messages: UIMessage[] }) => Promise<void>;
	}) => {
		state.createStreamCalls += 1;
		state.capturedOnFinish = input.onFinish;
		return new Response("stream", { status: 200 });
	},
}));

let streamAssistantReply: typeof import("./assistant-stream").streamAssistantReply;
let constants: typeof import("./constants");

beforeAll(async () => {
	({ streamAssistantReply } = await import("./assistant-stream"));
	constants = await import("./constants");
});

afterEach(() => {
	resetState();
	mock.restore();
});

afterAll(() => {
	mock.restore();
});

function textMessage(
	id: string,
	role: UIMessage["role"],
	text: string,
): UIMessage {
	return { id, role, parts: [{ type: "text", text }] };
}

function createInput(
	overrides: Partial<Parameters<typeof streamAssistantReply>[0]> = {},
) {
	return {
		request: new Request("http://localhost/api/chat", { method: "POST" }),
		requestId: "request-1",
		route: "/api/chat",
		agentOptions: { googleApiKey: "test-key" },
		chatId: "chat-1",
		userId: "user-1",
		message: textMessage("m-user", "user", "hello"),
		ipHash: "iphash",
		hasExistingSession: false,
		mcpServiceBinding: {
			fetch: async () => new Response("ok"),
		} as unknown as Fetcher,
		mcpInternalSecret: "secret",
		mcpServerUrl: "https://ore-ai-mcp/mcp",
		resolveMcpTools: async (_input: unknown) => ({
			tools: {
				"ore.tool": { execute: async () => ({ ok: true }) },
			} as unknown as ToolSet,
			close: async () => {
				state.closeCalls += 1;
			},
		}),
		...overrides,
	};
}

describe("streamAssistantReply", () => {
	test("creates a session for new chat, validates/persists messages, and closes MCP tools", async () => {
		const response = await streamAssistantReply(
			createInput({ hasExistingSession: false }),
		);
		expect(response.status).toBe(200);
		expect(state.sessions).toEqual([
			{ id: "chat-1", userId: "user-1", title: "hello" },
		]);
		expect(state.validateCalls).toHaveLength(1);
		expect(state.createStreamCalls).toBe(1);

		await state.capturedOnFinish?.({
			messages: [
				textMessage("m-user", "user", "hello"),
				textMessage("m-assistant", "assistant", "response"),
			],
		});

		expect(state.closeCalls).toBe(1);
		expect(state.lastActivity.at(-1)).toMatchObject({
			chatId: "chat-1",
			userId: "user-1",
			lastMessagePreview: "response",
		});
	});

	test("loads prior messages when chat exists", async () => {
		state.messagesBySession.set("chat-1", [
			{
				id: "old-1",
				role: "assistant",
				partsJson: JSON.stringify([{ type: "text", text: "old" }]),
			},
		]);

		await streamAssistantReply(createInput({ hasExistingSession: true }));

		expect(state.sessions).toHaveLength(0);
		expect(state.recentQueryArgs).toEqual([
			{
				chatId: "chat-1",
				userId: "user-1",
				limit: constants.CHAT_CONTEXT_MESSAGE_LIMIT - 1,
			},
		]);
		expect(state.validateCalls[0]?.messages.map((entry) => entry.id)).toContain(
			"m-user",
		);
	});
});
