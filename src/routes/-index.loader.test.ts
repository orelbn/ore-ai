import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
	userId: null as string | null,
	latestConversation: {
		conversationId: "conversation-1",
		messages: [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", text: "hi" }],
			},
		],
	},
	emptyConversation: {
		conversationId: "empty-conversation",
		messages: [] as unknown[],
	},
	turnstileSiteKey: "site-key",
}));

vi.mock("@/modules/chat", () => ({
	createEmptyConversationSeed: () => state.emptyConversation,
	loadLatestConversationSeed: async () => state.latestConversation,
}));

vi.mock("@/modules/session", () => ({
	getActiveSessionUserId: async () => state.userId,
}));

vi.mock("cloudflare:workers", () => ({
	env: {
		get TURNSTILE_SITE_KEY() {
			return state.turnstileSiteKey;
		},
	},
}));

let loadIndexRouteData: typeof import("./-index.loader").loadIndexRouteData;

beforeAll(async () => {
	({ loadIndexRouteData } = await import("./-index.loader"));
});

beforeEach(() => {
	state.userId = null;
	state.turnstileSiteKey = "site-key";
});

describe("loadIndexRouteData", () => {
	test("should return the latest conversation for an authenticated user", async () => {
		state.userId = "user-1";

		await expect(loadIndexRouteData(new Headers())).resolves.toEqual({
			hasActiveSession: true,
			initialConversationJson: JSON.stringify(state.latestConversation),
			turnstileSiteKey: "site-key",
		});
	});

	test("should return an empty conversation for an unauthenticated user", async () => {
		await expect(loadIndexRouteData(new Headers())).resolves.toEqual({
			hasActiveSession: false,
			initialConversationJson: JSON.stringify(state.emptyConversation),
			turnstileSiteKey: "site-key",
		});
	});
});
