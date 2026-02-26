import { ChatRequestError } from "@/lib/chat/validation";
import type { UIMessage } from "ai";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";

const userMessage: UIMessage = {
	id: "message-1",
	role: "user",
	parts: [{ type: "text", text: "Hello Ore AI" }],
};

const mcpServiceBinding = {
	fetch: async () => new Response("ok"),
} as unknown as Fetcher;

const workersEnv = {
	AI: {} as Ai,
	BETTER_AUTH_SECRET: "test-secret",
	MCP_INTERNAL_SHARED_SECRET: "mcp-secret",
	MCP_SERVER_URL: "https://ore-ai-mcp/mcp",
	AGENT_SYSTEM_PROMPT: "test system prompt",
	ORE_AI_MCP: mcpServiceBinding,
	AGENT_SYSTEM_PROMPT_R2_KEY: undefined as string | undefined,
	AGENT_PROMPTS: undefined as
		| {
				get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
		  }
		| undefined,
};

const state = {
	userId: null as string | null,
	chatRequestError: null as ChatRequestError | null,
	rateLimitResult: {
		ok: true,
		ipHash: "hashed-ip",
	} as { ok: true; ipHash: string | null } | { ok: false; response: Response },
	ownershipResult: {
		ok: true,
		hasExistingSession: false,
	} as
		| { ok: true; hasExistingSession: boolean }
		| { ok: false; response: Response },
	streamResponse: new Response("stream", {
		status: 200,
		headers: {
			"content-type": "text/event-stream",
		},
	}),
	streamCalls: [] as Array<{
		chatId: string;
		userId: string;
		message: UIMessage;
		mcpInternalSecret: string;
		mcpServerUrl: string;
		agentSystemPrompt?: string;
		mcpServiceBinding: Fetcher;
	}>,
};

function resetState() {
	state.userId = null;
	state.chatRequestError = null;
	state.rateLimitResult = {
		ok: true,
		ipHash: "hashed-ip",
	};
	state.ownershipResult = {
		ok: true,
		hasExistingSession: false,
	};
	state.streamResponse = new Response("stream", {
		status: 200,
		headers: {
			"content-type": "text/event-stream",
		},
	});
	state.streamCalls = [];
	workersEnv.MCP_SERVER_URL = "https://ore-ai-mcp/mcp";
	workersEnv.AGENT_SYSTEM_PROMPT = "test system prompt";
	workersEnv.AGENT_SYSTEM_PROMPT_R2_KEY = undefined;
	workersEnv.AGENT_PROMPTS = undefined;
}

mock.module("cloudflare:workers", () => ({
	env: workersEnv,
}));

mock.module("@/lib/chat/cloudflare", () => ({
	getCloudflareRequestMetadata: () => ({
		cfRay: null,
		cfColo: null,
		cfCountry: null,
	}),
}));

mock.module("@/lib/chat/error-reporting", () => ({
	reportChatRouteError: () => {},
}));

mock.module("@/lib/chat/logging", () => ({
	logChatApiEvent: () => {},
}));

mock.module("@/lib/chat/assistant-stream", () => ({
	selectAssistantMessagesForCurrentTurn: (input: {
		allMessages: UIMessage[];
		requestMessageId: string;
		knownMessageIds: Set<string>;
	}) => {
		let requestIndex = -1;
		let fallbackUserIndex = -1;
		for (let index = input.allMessages.length - 1; index >= 0; index -= 1) {
			const message = input.allMessages[index];
			if (requestIndex === -1 && message.id === input.requestMessageId) {
				requestIndex = index;
			}
			if (fallbackUserIndex === -1 && message.role === "user") {
				fallbackUserIndex = index;
			}
			if (requestIndex !== -1 && fallbackUserIndex !== -1) {
				break;
			}
		}
		const startIndex = requestIndex >= 0 ? requestIndex : fallbackUserIndex;
		const candidates =
			startIndex >= 0
				? input.allMessages.slice(startIndex + 1)
				: input.allMessages;

		const selected: UIMessage[] = [];
		const seenIds = new Set<string>();
		for (const candidate of candidates) {
			if (candidate.role !== "assistant") {
				continue;
			}
			if (!Array.isArray(candidate.parts) || candidate.parts.length === 0) {
				continue;
			}
			if (
				input.knownMessageIds.has(candidate.id) ||
				seenIds.has(candidate.id)
			) {
				continue;
			}
			seenIds.add(candidate.id);
			selected.push(candidate);
		}

		return selected;
	},
	streamAssistantReply: async (input: {
		chatId: string;
		userId: string;
		message: UIMessage;
		mcpInternalSecret: string;
		mcpServerUrl: string;
		agentSystemPrompt?: string;
		mcpServiceBinding: Fetcher;
	}) => {
		state.streamCalls.push({
			chatId: input.chatId,
			userId: input.userId,
			message: input.message,
			mcpInternalSecret: input.mcpInternalSecret,
			mcpServerUrl: input.mcpServerUrl,
			agentSystemPrompt: input.agentSystemPrompt,
			mcpServiceBinding: input.mcpServiceBinding,
		});
		return state.streamResponse;
	},
}));

mock.module("@/lib/chat/route-steps", () => ({
	requireAuthenticatedUserId: async () => state.userId,
	parseRouteChatId: (rawChatId: string) => rawChatId,
	validateChatRateLimit: async () => state.rateLimitResult,
	validateChatPostRequest: async () => {
		if (state.chatRequestError) {
			throw state.chatRequestError;
		}
		return { id: "chat-1", message: userMessage };
	},
	validateChatOwnership: async () => state.ownershipResult,
	mapChatRequestErrorToResponse: (error: ChatRequestError) =>
		new Response("invalid", { status: error.status }),
}));

let POST: typeof import("./chat").POST;

beforeAll(async () => {
	({ POST } = await import("./chat"));
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

function createRequest() {
	return new Request("http://localhost/api/chat", {
		method: "POST",
		body: JSON.stringify({
			id: "chat-1",
			message: userMessage,
		}),
	});
}

function createPromptBucket(promptByKey: Record<string, string>) {
	return {
		get: async (key: string) => {
			const text = promptByKey[key];
			if (typeof text !== "string") {
				return null;
			}
			return {
				text: async () => text,
			};
		},
	};
}

describe("POST /api/chat", () => {
	test("returns 401 when unauthenticated", async () => {
		const response = await POST(createRequest());
		expect(response.status).toBe(401);
	});

	test("returns 429 when rate limited", async () => {
		state.userId = "user-1";
		state.rateLimitResult = {
			ok: false,
			response: new Response("Rate limit", { status: 429 }),
		};

		const response = await POST(createRequest());
		expect(response.status).toBe(429);
	});

	test("returns 403 when ownership check fails", async () => {
		state.userId = "user-1";
		state.ownershipResult = {
			ok: false,
			response: new Response("Forbidden", { status: 403 }),
		};

		const response = await POST(createRequest());
		expect(response.status).toBe(403);
	});

	test("returns 400 for invalid payload errors", async () => {
		state.userId = "user-1";
		state.chatRequestError = new ChatRequestError("Invalid payload", 400);

		const response = await POST(createRequest());
		expect(response.status).toBe(400);
	});

	test("streams assistant response for valid requests", async () => {
		state.userId = "user-1";

		const response = await POST(createRequest());

		expect(response.status).toBe(200);
		expect(state.streamCalls).toEqual([
			{
				chatId: "chat-1",
				userId: "user-1",
				message: userMessage,
				mcpInternalSecret: "mcp-secret",
				mcpServerUrl: "https://ore-ai-mcp/mcp",
				agentSystemPrompt: "test system prompt",
				mcpServiceBinding,
			},
		]);
	});

	test("uses R2 prompt when inline prompt values are unset", async () => {
		state.userId = "user-1";
		workersEnv.AGENT_SYSTEM_PROMPT = "";
		workersEnv.AGENT_SYSTEM_PROMPT_R2_KEY = "prompts/prod.txt";
		workersEnv.AGENT_PROMPTS = createPromptBucket({
			"prompts/prod.txt": "prompt from R2",
		});

		const response = await POST(createRequest());

		expect(response.status).toBe(200);
		expect(state.streamCalls.at(-1)?.agentSystemPrompt).toBe("prompt from R2");
	});

	test("falls back to default prompt when R2 prompt config is invalid", async () => {
		state.userId = "user-1";
		workersEnv.AGENT_SYSTEM_PROMPT = "";
		workersEnv.AGENT_SYSTEM_PROMPT_R2_KEY = "prompts/prod.txt";
		workersEnv.AGENT_PROMPTS = undefined;

		const response = await POST(createRequest());

		expect(response.status).toBe(200);
		expect(state.streamCalls.at(-1)?.agentSystemPrompt).toBeUndefined();
	});

	test("returns 500 when MCP_SERVER_URL is invalid", async () => {
		state.userId = "user-1";
		workersEnv.MCP_SERVER_URL = "not-a-url";

		const response = await POST(createRequest());
		expect(response.status).toBe(500);
	});
});
