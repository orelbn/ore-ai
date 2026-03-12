import type { verifySessionFromRequest } from "@/services/better-auth/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ChatRequestError } from "../../schema/validation";
import {
	mapChatRequestErrorToResponse,
	parseRouteChatId,
	requireAuthenticatedUserId,
	validateChatOwnership,
	validateChatPostRequest,
	validateChatRateLimit,
} from "./request-guards";

type SessionResult = Awaited<ReturnType<typeof verifySessionFromRequest>>;

const state = vi.hoisted(() => ({
	sessionResult: null as SessionResult,
	clientIp: null as string | null,
	hashedIp: "hashed-ip",
	rateLimited: false,
	owner: null as { id: string; userId: string } | null,
}));

function resetState() {
	state.sessionResult = null;
	state.clientIp = null;
	state.hashedIp = "hashed-ip";
	state.rateLimited = false;
	state.owner = null;
}

vi.mock("@/services/better-auth/server", () => ({
	verifySessionFromRequest: async () => state.sessionResult,
}));

vi.mock("../safety/security", () => ({
	getClientIp: () => state.clientIp,
	hashIpAddress: async () => state.hashedIp,
}));

vi.mock("../safety/rate-limit", () => ({
	checkChatRateLimit: async () => ({
		limited: state.rateLimited,
		reason: state.rateLimited ? ("user" as const) : null,
		userCount: state.rateLimited ? 20 : 1,
		ipCount: 0,
	}),
}));

vi.mock("../../repo", () => ({
	getChatSessionOwner: async () => state.owner,
}));

beforeEach(() => {
	resetState();
});

describe("route steps", () => {
	test("requireAuthenticatedUserId returns null without session user", async () => {
		await expect(
			requireAuthenticatedUserId(new Request("http://localhost")),
		).resolves.toBeNull();
	});

	test("requireAuthenticatedUserId returns authenticated user id", async () => {
		state.sessionResult = {
			user: { id: "user-1" },
		} as SessionResult;

		await expect(
			requireAuthenticatedUserId(new Request("http://localhost")),
		).resolves.toBe("user-1");
	});

	test("validateChatRateLimit returns limited response", async () => {
		state.clientIp = "203.0.113.7";
		state.rateLimited = true;

		const result = await validateChatRateLimit({
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

		const result = await validateChatRateLimit({
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

		const result = await validateChatPostRequest(request);
		expect(result.id).toBe("chat-1");
		expect(result.message.id).toBe("m-1");
	});

	test("validateChatOwnership handles missing session by allowMissing", async () => {
		state.owner = null;

		await expect(
			validateChatOwnership({
				chatId: "chat-1",
				userId: "user-1",
				allowMissing: true,
			}),
		).resolves.toEqual({ ok: true, hasExistingSession: false });
	});

	test("validateChatOwnership returns 403 for non-owner", async () => {
		state.owner = { id: "chat-1", userId: "user-2" };

		const result = await validateChatOwnership({
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
		expect(parseRouteChatId("chat-1")).toBe("chat-1");
		expect(() => parseRouteChatId("../bad")).toThrow(ChatRequestError);
	});

	test("mapChatRequestErrorToResponse maps 413 specially", async () => {
		const payload413 = await mapChatRequestErrorToResponse(
			new ChatRequestError("too big", 413),
		).json();
		expect(payload413).toEqual({ error: "Message is too large." });

		const payload400 = await mapChatRequestErrorToResponse(
			new ChatRequestError("bad", 400),
		).json();
		expect(payload400).toEqual({ error: "Invalid request." });
	});
});
