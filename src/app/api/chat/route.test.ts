import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import type { UIMessage } from "ai";

type TestSession = {
	user: {
		id: string;
	};
} | null;

type ChatOwner = {
	id: string;
	userId: string;
} | null;

type RateLimitResult = {
	limited: boolean;
	reason: "user" | "ip" | null;
	userCount: number;
	ipCount: number;
};

const state = {
	session: null as TestSession,
	owner: null as ChatOwner,
	priorMessages: [] as UIMessage[],
	rateLimitResult: {
		limited: false,
		reason: null,
		userCount: 0,
		ipCount: 0,
	} as RateLimitResult,
	validatedMessages: null as UIMessage[] | null,
	finishMessages: null as UIMessage[] | null,
	createdSessions: [] as Array<{ id: string; userId: string; title: string }>,
	appendedPayloads: [] as Array<{
		chatId: string;
		userId: string;
		messages: UIMessage[];
		ipHash: string | null;
	}>,
	rateLimitInputs: [] as Array<{ userId: string; ipHash: string | null }>,
	createdAgentBindings: [] as Ai[],
	streamCalls: [] as Array<{
		uiMessages: UIMessage[];
		originalMessages: UIMessage[];
	}>,
};

function resetState() {
	state.session = null;
	state.owner = null;
	state.priorMessages = [];
	state.rateLimitResult = {
		limited: false,
		reason: null,
		userCount: 0,
		ipCount: 0,
	};
	state.validatedMessages = null;
	state.finishMessages = null;
	state.createdSessions = [];
	state.appendedPayloads = [];
	state.rateLimitInputs = [];
	state.createdAgentBindings = [];
	state.streamCalls = [];
}

mock.module("@/lib/auth", () => ({
	verifySession: async () => state.session,
	getAuth: async () => ({
		handler: async () => new Response(null, { status: 200 }),
	}),
}));

mock.module("@/lib/chat/repository", () => ({
	appendMessagesToChat: async (input: {
		chatId: string;
		userId: string;
		messages: UIMessage[];
		ipHash: string | null;
	}) => {
		state.appendedPayloads.push(input);
	},
	buildChatTitleFromMessage: () => "Session title",
	createChatSession: async (input: {
		id: string;
		userId: string;
		title: string;
	}) => {
		state.createdSessions.push(input);
	},
	deleteChatForUser: async () => true,
	getChatSessionOwner: async () => state.owner,
	listChatSummariesForUser: async () => [],
	loadChatForUser: async () => null,
	loadRecentChatMessagesForUser: async () => state.priorMessages,
}));

mock.module("@/lib/chat/rate-limit", () => ({
	checkChatRateLimit: async (input: {
		userId: string;
		ipHash: string | null;
	}) => {
		state.rateLimitInputs.push(input);
		return state.rateLimitResult;
	},
}));

mock.module("@/lib/chat/security", () => ({
	getClientIp: () => "127.0.0.1",
	hashIpAddress: async () => "hashed-ip",
}));

mock.module("@opennextjs/cloudflare", () => ({
	getCloudflareContext: async () => ({
		env: {
			AI: {} as Ai,
			BETTER_AUTH_SECRET: "test-secret",
		},
	}),
}));

mock.module("@/lib/agents/ore-agent", () => ({
	createOreAgent: (binding: Ai) => {
		state.createdAgentBindings.push(binding);
		return { id: "test-agent" };
	},
}));

mock.module("ai", () => ({
	validateUIMessages: async ({ messages }: { messages: UIMessage[] }) =>
		state.validatedMessages ?? messages,
	createAgentUIStreamResponse: async (input: {
		uiMessages: UIMessage[];
		originalMessages: UIMessage[];
		onFinish?: (payload: { messages: UIMessage[] }) => Promise<void>;
	}) => {
		state.streamCalls.push({
			uiMessages: input.uiMessages,
			originalMessages: input.originalMessages,
		});
		if (input.onFinish) {
			await input.onFinish({
				messages: state.finishMessages ?? input.uiMessages,
			});
		}
		return new Response("stream", {
			status: 200,
			headers: {
				"content-type": "text/event-stream",
			},
		});
	},
}));

let POST: typeof import("./route").POST;

beforeAll(async () => {
	({ POST } = await import("./route"));
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

function buildValidPayload(text = "hello world") {
	return JSON.stringify({
		id: "session-1",
		message: {
			id: "message-1",
			role: "user",
			parts: [{ type: "text", text }],
		},
	});
}

describe("POST /api/chat", () => {
	test("returns 401 when unauthenticated", async () => {
		const response = await POST(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: buildValidPayload(),
			}),
		);

		expect(response.status).toBe(401);
	});

	test("returns 400 for invalid payloads", async () => {
		state.session = { user: { id: "user-1" } };

		const response = await POST(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: "{ bad json",
			}),
		);

		expect(response.status).toBe(400);
	});

	test("returns 413 for oversized messages", async () => {
		state.session = { user: { id: "user-1" } };

		const response = await POST(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: buildValidPayload("x".repeat(2100)),
			}),
		);

		expect(response.status).toBe(413);
	});

	test("returns 403 when the session belongs to another user", async () => {
		state.session = { user: { id: "user-1" } };
		state.owner = {
			id: "session-1",
			userId: "user-2",
		};

		const response = await POST(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: buildValidPayload(),
			}),
		);

		expect(response.status).toBe(403);
	});

	test("returns 429 when request is rate limited", async () => {
		state.session = { user: { id: "user-1" } };
		state.owner = {
			id: "session-1",
			userId: "user-1",
		};
		state.rateLimitResult = {
			limited: true,
			reason: "user",
			userCount: 20,
			ipCount: 0,
		};

		const response = await POST(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: buildValidPayload(),
			}),
		);

		expect(response.status).toBe(429);
	});

	test("creates a new session and persists user and assistant messages", async () => {
		state.session = { user: { id: "user-1" } };

		const userMessage: UIMessage = {
			id: "message-1",
			role: "user",
			parts: [{ type: "text", text: "Hello Ore AI" }],
		};
		const assistantMessage: UIMessage = {
			id: "message-2",
			role: "assistant",
			parts: [{ type: "text", text: "Hi there" }],
		};

		state.validatedMessages = [userMessage];
		state.finishMessages = [userMessage, assistantMessage];

		const response = await POST(
			new Request("http://localhost/api/chat", {
				method: "POST",
				body: JSON.stringify({
					id: "session-1",
					message: userMessage,
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(state.createdSessions).toEqual([
			{
				id: "session-1",
				userId: "user-1",
				title: "Session title",
			},
		]);
		expect(state.rateLimitInputs).toEqual([
			{
				userId: "user-1",
				ipHash: "hashed-ip",
			},
		]);
		expect(state.createdAgentBindings.length).toBe(1);
		expect(state.streamCalls.length).toBe(1);
		expect(state.appendedPayloads).toEqual([
			{
				chatId: "session-1",
				userId: "user-1",
				messages: [userMessage],
				ipHash: "hashed-ip",
			},
			{
				chatId: "session-1",
				userId: "user-1",
				messages: [assistantMessage],
				ipHash: null,
			},
		]);
	});
});
