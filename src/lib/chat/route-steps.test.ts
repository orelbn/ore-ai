import { ChatRequestError } from "@/lib/chat/validation";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";

const state = {
	sessionResult: null as null | {
		user?: { id: string };
	},
	clientIp: null as string | null,
	hashedIp: "hashed-ip",
	rateLimited: false,
	owner: null as { id: string; userId: string } | null,
};

function resetState() {
	state.sessionResult = null;
	state.clientIp = null;
	state.hashedIp = "hashed-ip";
	state.rateLimited = false;
	state.owner = null;
}

mock.module("@/lib/auth-server", () => ({
	verifySessionFromRequest: async () => state.sessionResult,
}));

mock.module("./security", () => ({
	getClientIp: () => state.clientIp,
	hashIpAddress: async () => state.hashedIp,
}));

mock.module("./rate-limit", () => ({
	checkChatRateLimit: async () => ({
		limited: state.rateLimited,
		reason: state.rateLimited ? "user" : null,
		userCount: state.rateLimited ? 20 : 1,
		ipCount: 0,
	}),
}));

mock.module("./repository", () => ({
	getChatSessionOwner: async () => state.owner,
}));

let steps: typeof import("./route-steps");

beforeAll(async () => {
	steps = await import("./route-steps");
});

beforeEach(() => {
	resetState();
});

afterAll(() => {
	mock.restore();
});

describe("route steps", () => {
	test("requireAuthenticatedUserId returns null without session user", async () => {
		await expect(
			steps.requireAuthenticatedUserId(new Request("http://localhost")),
		).resolves.toBeNull();
	});

	test("requireAuthenticatedUserId returns authenticated user id", async () => {
		state.sessionResult = { user: { id: "user-1" } };

		await expect(
			steps.requireAuthenticatedUserId(new Request("http://localhost")),
		).resolves.toBe("user-1");
	});

	test("validateChatRateLimit returns limited response", async () => {
		state.clientIp = "203.0.113.7";
		state.rateLimited = true;

		const result = await steps.validateChatRateLimit({
			request: new Request("http://localhost"),
			userId: "user-1",
			authSecret: "secret",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.response.status).toBe(429);
		}
	});

	test("validateChatRateLimit returns hash when allowed", async () => {
		state.clientIp = "203.0.113.7";
		state.hashedIp = "iphash";

		const result = await steps.validateChatRateLimit({
			request: new Request("http://localhost"),
			userId: "user-1",
			authSecret: "secret",
		});

		expect(result).toEqual({ ok: true, ipHash: "iphash" });
	});

	test("validateChatPostRequest parses request payload", async () => {
		const request = new Request("http://localhost", {
			method: "POST",
			body: JSON.stringify({
				id: "chat-1",
				message: {
					id: "m-1",
					role: "user",
					parts: [{ type: "text", text: "hello" }],
				},
			}),
		});

		const result = await steps.validateChatPostRequest(request);
		expect(result.id).toBe("chat-1");
		expect(result.message.id).toBe("m-1");
	});

	test("validateChatOwnership handles missing session by allowMissing", async () => {
		state.owner = null;

		await expect(
			steps.validateChatOwnership({
				chatId: "chat-1",
				userId: "user-1",
				allowMissing: true,
			}),
		).resolves.toEqual({ ok: true, hasExistingSession: false });
	});

	test("validateChatOwnership returns 403 for non-owner", async () => {
		state.owner = { id: "chat-1", userId: "user-2" };

		const result = await steps.validateChatOwnership({
			chatId: "chat-1",
			userId: "user-1",
			allowMissing: false,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.response.status).toBe(403);
		}
	});

	test("parseRouteChatId validates path params", () => {
		expect(steps.parseRouteChatId("chat-1")).toBe("chat-1");
		expect(() => steps.parseRouteChatId("../bad")).toThrow(ChatRequestError);
	});

	test("mapChatRequestErrorToResponse maps 413 specially", async () => {
		const payload413 = await steps
			.mapChatRequestErrorToResponse(new ChatRequestError("too big", 413))
			.json();
		expect(payload413).toEqual({ error: "Message is too large." });

		const payload400 = await steps
			.mapChatRequestErrorToResponse(new ChatRequestError("bad", 400))
			.json();
		expect(payload400).toEqual({ error: "Invalid request." });
	});
});
