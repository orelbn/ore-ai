import { afterEach, describe, expect, mock, test } from "bun:test";
import { deleteChat, getChat, listChats } from "./client";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
	mock.restore();
});

describe("chat client", () => {
	test("listChats returns parsed DTO", async () => {
		globalThis.fetch = mock(async () =>
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
		) as unknown as typeof fetch;

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
		globalThis.fetch = mock(async () =>
			Response.json({
				id: "chat-1",
				title: "Roadmap",
				messages: [
					{ id: "m-1", role: "user", parts: [{ type: "text", text: "hi" }] },
				],
			}),
		) as unknown as typeof fetch;

		await expect(getChat("chat-1")).resolves.toMatchObject({ id: "chat-1" });
	});

	test("throws API error payload on failed request", async () => {
		globalThis.fetch = mock(
			async () =>
				new Response(JSON.stringify({ error: "Forbidden" }), {
					status: 403,
					headers: { "content-type": "application/json" },
				}),
		) as unknown as typeof fetch;

		await expect(deleteChat("chat-1")).rejects.toThrow("Forbidden");
	});

	test("falls back to generic status message for non-JSON errors", async () => {
		globalThis.fetch = mock(
			async () =>
				new Response("not-json", {
					status: 500,
					headers: { "content-type": "text/plain" },
				}),
		) as unknown as typeof fetch;

		await expect(listChats()).rejects.toThrow("Request failed (500)");
	});

	test("throws for invalid JSON success payload", async () => {
		globalThis.fetch = mock(
			async () =>
				new Response("not-json", {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		) as unknown as typeof fetch;

		await expect(listChats()).rejects.toThrow("Invalid JSON response.");
	});
});
