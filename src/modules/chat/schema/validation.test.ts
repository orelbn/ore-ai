import { describe, expect, test } from "vitest";
import {
	ChatRequestError,
	assertRequestBodySize,
	parseAndValidateChatRequest,
	validateRouteChatId,
} from "./validation";

describe("chat request validation", () => {
	test("parses valid user message payload", () => {
		const payload = JSON.stringify({
			id: "chat-123",
			message: {
				id: "message-1",
				role: "user",
				parts: [{ type: "text", text: "Hello" }],
			},
		});

		expect(parseAndValidateChatRequest(payload)).toEqual({
			id: "chat-123",
			message: {
				id: "message-1",
				role: "user",
				parts: [{ type: "text", text: "Hello" }],
			},
		});
	});

	test("rejects invalid JSON payload", () => {
		expect(() => parseAndValidateChatRequest("{oops")).toThrow(
			ChatRequestError,
		);
	});

	test("rejects invalid chat id and invalid role", () => {
		expect(() =>
			parseAndValidateChatRequest(
				JSON.stringify({
					id: "../bad",
					message: {
						id: "m-1",
						role: "user",
						parts: [{ type: "text", text: "hi" }],
					},
				}),
			),
		).toThrow(ChatRequestError);

		expect(() =>
			parseAndValidateChatRequest(
				JSON.stringify({
					id: "chat-1",
					message: {
						id: "m-1",
						role: "assistant",
						parts: [{ type: "text", text: "hi" }],
					},
				}),
			),
		).toThrow(ChatRequestError);
	});

	test("rejects empty or non-text parts", () => {
		expect(() =>
			parseAndValidateChatRequest(
				JSON.stringify({
					id: "chat-1",
					message: {
						id: "m-1",
						role: "user",
						parts: [{ type: "text", text: "" }],
					},
				}),
			),
		).toThrow(ChatRequestError);

		expect(() =>
			parseAndValidateChatRequest(
				JSON.stringify({
					id: "chat-1",
					message: {
						id: "m-1",
						role: "user",
						parts: [{ type: "file", url: "https://example.com" }],
					},
				}),
			),
		).toThrow(ChatRequestError);
	});

	test("rejects oversized message content and body size", () => {
		expect(() =>
			parseAndValidateChatRequest(
				JSON.stringify({
					id: "chat-1",
					message: {
						id: "m-1",
						role: "user",
						parts: [{ type: "text", text: "x".repeat(2500) }],
					},
				}),
			),
		).toThrow(ChatRequestError);

		const oversizedBody = "a".repeat(70 * 1024);
		const headers = new Headers({
			"content-length": String(oversizedBody.length),
		});
		expect(() => assertRequestBodySize(headers, oversizedBody)).toThrow(
			ChatRequestError,
		);
	});

	test("validateRouteChatId allows valid ids and rejects invalid path ids", () => {
		expect(validateRouteChatId("chat_abc-123")).toBe("chat_abc-123");
		expect(() => validateRouteChatId("../bad")).toThrow(ChatRequestError);
	});
});
