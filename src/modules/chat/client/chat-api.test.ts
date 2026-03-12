import { afterEach, describe, expect, vi, test } from "vitest";
import { deleteChat, getChat, listChats } from "./chat-api";

function mockFetch(factory: () => Response | Promise<Response>) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => factory()),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("chat client", () => {
	test("listChats returns parsed DTO", async () => {
		mockFetch(() =>
			Response.json({
				chats: [
					{
						id: "chat-1",
						title: "Roadmap",
						updatedAt: 1700000000000,
						lastMessagePreview: "Plan Q2",
					},
				],
			}),
		);

		await expect(listChats()).resolves.toEqual({
			chats: [
				{
					id: "chat-1",
					title: "Roadmap",
					updatedAt: 1700000000000,
					lastMessagePreview: "Plan Q2",
				},
			],
		});
	});

	test("getChat returns parsed chat detail DTO", async () => {
		mockFetch(() =>
			Response.json({
				id: "chat-1",
				title: "Roadmap",
				messages: [
					{ id: "m-1", role: "user", parts: [{ type: "text", text: "hi" }] },
				],
			}),
		);

		await expect(getChat("chat-1")).resolves.toMatchObject({ id: "chat-1" });
	});

	test("throws API error payload on failed request", async () => {
		mockFetch(
			() =>
				new Response(JSON.stringify({ error: "Forbidden" }), {
					status: 403,
					headers: { "content-type": "application/json" },
				}),
		);

		await expect(deleteChat("chat-1")).rejects.toThrow("Forbidden");
	});

	test("falls back to generic status message for non-JSON errors", async () => {
		mockFetch(
			() =>
				new Response("not-json", {
					status: 500,
					headers: { "content-type": "text/plain" },
				}),
		);

		await expect(listChats()).rejects.toThrow("Request failed (500)");
	});

	test("throws for invalid JSON success payload", async () => {
		mockFetch(
			() =>
				new Response("not-json", {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		);

		await expect(listChats()).rejects.toThrow("Invalid JSON response.");
	});
});
