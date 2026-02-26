import { ChatRequestError } from "@/lib/chat/validation";
import type { UIMessage } from "ai";
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

const state = {
	userId: null as string | null,
	chats: [] as Array<{
		id: string;
		title: string;
		updatedAt: number;
		lastMessagePreview: string;
	}>,
	parseError: null as Error | null,
	ownership: {
		ok: true,
		hasExistingSession: true,
	} as
		| { ok: true; hasExistingSession: boolean }
		| { ok: false; response: Response },
	chatDetail: null as {
		id: string;
		title: string;
		messages: UIMessage[];
	} | null,
	requestedUserIds: [] as string[],
	loaded: [] as Array<{ chatId: string; userId: string }>,
	deleted: [] as Array<{ chatId: string; userId: string }>,
};

function resetState() {
	state.userId = null;
	state.chats = [];
	state.parseError = null;
	state.ownership = {
		ok: true,
		hasExistingSession: true,
	};
	state.chatDetail = null;
	state.requestedUserIds = [];
	state.loaded = [];
	state.deleted = [];
}

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

mock.module("@/lib/chat/route-steps", () => ({
	requireAuthenticatedUserId: async () => state.userId,
	parseRouteChatId: (rawChatId: string) => {
		if (state.parseError) {
			throw state.parseError;
		}
		return rawChatId;
	},
	validateChatRateLimit: async () => ({
		ok: true as const,
		ipHash: null,
	}),
	validateChatPostRequest: async () => ({
		id: "chat-1",
		message: {
			id: "message-1",
			role: "user" as const,
			parts: [{ type: "text" as const, text: "hello" }],
		},
	}),
	validateChatOwnership: async () => state.ownership,
	mapChatRequestErrorToResponse: () => new Response("invalid", { status: 400 }),
}));

mock.module("@/lib/chat/repository", () => ({
	buildChatTitleFromMessage: () => "Session title",
	getPersistedMessageId: (input: {
		messageId: string;
		sessionId: string;
		role: UIMessage["role"];
		index: number;
	}) => {
		const normalizedId = input.messageId.trim();
		if (normalizedId.length > 0) {
			return normalizedId;
		}
		return `${input.sessionId}:${input.role}:${input.index}:generated`;
	},
	listChatSummariesForUser: async (userId: string) => {
		state.requestedUserIds.push(userId);
		return state.chats;
	},
	getChatSessionOwner: async () => null,
	createChatSession: async () => {},
	loadChatMessagesForUser: async () => [],
	loadRecentChatMessagesForUser: async () => [],
	appendMessagesToChat: async () => {},
	loadChatForUser: async (input: { chatId: string; userId: string }) => {
		state.loaded.push(input);
		return state.chatDetail;
	},
	deleteChatForUser: async (input: { chatId: string; userId: string }) => {
		state.deleted.push(input);
		return true;
	},
}));

async function loadHandlers() {
	const { GET } = await import("./chats");
	const { GET: GET_BY_ID, DELETE: DELETE_BY_ID } = await import(
		"./chats/$chatId"
	);
	return { GET, GET_BY_ID, DELETE_BY_ID };
}

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

describe("GET /api/chats", () => {
	test("returns 401 when unauthenticated", async () => {
		const { GET } = await loadHandlers();
		const response = await GET(new Request("http://localhost/api/chats"));
		expect(response.status).toBe(401);
	});

	test("returns chat summaries for the authenticated user", async () => {
		const { GET } = await loadHandlers();
		state.userId = "user-1";
		state.chats = [
			{
				id: "chat-2",
				title: "Roadmap",
				updatedAt: 1700000000000,
				lastMessagePreview: "Outline Q2 milestones",
			},
			{
				id: "chat-1",
				title: "Architecture",
				updatedAt: 1690000000000,
				lastMessagePreview: "Compare options",
			},
		];

		const response = await GET(new Request("http://localhost/api/chats"));
		const payload = (await response.json()) as { chats: typeof state.chats };

		expect(response.status).toBe(200);
		expect(payload.chats).toEqual(state.chats);
		expect(state.requestedUserIds).toEqual(["user-1"]);
	});
});

describe("/api/chats/:chatId", () => {
	test("GET returns 401 when unauthenticated", async () => {
		const { GET_BY_ID } = await loadHandlers();
		const response = await GET_BY_ID(new Request("http://localhost"), {
			params: { chatId: "chat-1" },
		});
		expect(response.status).toBe(401);
	});

	test("DELETE returns 401 when unauthenticated", async () => {
		const { DELETE_BY_ID } = await loadHandlers();
		const response = await DELETE_BY_ID(new Request("http://localhost"), {
			params: { chatId: "chat-1" },
		});
		expect(response.status).toBe(401);
	});

	test("returns 400 for invalid route ids", async () => {
		const { GET_BY_ID } = await loadHandlers();
		state.userId = "user-1";
		state.parseError = new ChatRequestError("Invalid chat id.", 400);

		const response = await GET_BY_ID(new Request("http://localhost"), {
			params: { chatId: "../bad" },
		});
		expect(response.status).toBe(400);
	});

	test("returns 403 when ownership check fails", async () => {
		const { GET_BY_ID } = await loadHandlers();
		state.userId = "user-1";
		state.ownership = {
			ok: false,
			response: new Response("Forbidden", { status: 403 }),
		};

		const response = await GET_BY_ID(new Request("http://localhost"), {
			params: { chatId: "chat-1" },
		});
		expect(response.status).toBe(403);
	});

	test("GET returns the chat when ownership check passes", async () => {
		const { GET_BY_ID } = await loadHandlers();
		state.userId = "user-1";
		state.chatDetail = {
			id: "chat-1",
			title: "Weekly planning",
			messages: [
				{
					id: "message-1",
					role: "user",
					parts: [{ type: "text", text: "Plan my week" }],
				},
				{
					id: "message-2",
					role: "assistant",
					parts: [{ type: "text", text: "Here is a draft plan" }],
				},
			],
		};

		const response = await GET_BY_ID(new Request("http://localhost"), {
			params: { chatId: "chat-1" },
		});
		const payload = (await response.json()) as typeof state.chatDetail;

		expect(response.status).toBe(200);
		expect(payload).toEqual(state.chatDetail);
		expect(state.loaded).toEqual([{ chatId: "chat-1", userId: "user-1" }]);
	});

	test("DELETE removes the chat when ownership check passes", async () => {
		const { DELETE_BY_ID } = await loadHandlers();
		state.userId = "user-1";

		const response = await DELETE_BY_ID(new Request("http://localhost"), {
			params: { chatId: "chat-1" },
		});

		expect(response.status).toBe(204);
		expect(state.deleted).toEqual([{ chatId: "chat-1", userId: "user-1" }]);
	});
});
