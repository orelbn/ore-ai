import { describe, expect, test } from "bun:test";
import {
	ChatRequestError,
	assertRequestBodySize,
	parseAndValidateChatRequest,
	validateRouteChatId,
} from "./validation";

describe("chat request validation", () => {
	test("parses a valid text-only payload", () => {
		const payload = JSON.stringify({
			id: "chat-123",
			message: {
				id: "message-1",
				role: "user",
				parts: [{ type: "text", text: "Hello Ore AI" }],
			},
		});

		const result = parseAndValidateChatRequest(payload);
		expect(result.id).toBe("chat-123");
		expect(result.message.role).toBe("user");
		expect(result.message.parts.length).toBe(1);
	});

	test("rejects invalid JSON payloads", () => {
		expect(() => parseAndValidateChatRequest("{oops")).toThrow(
			ChatRequestError,
		);
	});

	test("rejects invalid IDs", () => {
		const payload = JSON.stringify({
			id: "../bad-id",
			message: {
				id: "message-1",
				role: "user",
				parts: [{ type: "text", text: "Hello Ore AI" }],
			},
		});

		expect(() => parseAndValidateChatRequest(payload)).toThrow(
			ChatRequestError,
		);
	});

	test("rejects non-user roles", () => {
		const payload = JSON.stringify({
			id: "chat-123",
			message: {
				id: "message-1",
				role: "assistant",
				parts: [{ type: "text", text: "Hello Ore AI" }],
			},
		});

		expect(() => parseAndValidateChatRequest(payload)).toThrow(
			ChatRequestError,
		);
	});

	test("rejects empty text content", () => {
		const payload = JSON.stringify({
			id: "chat-123",
			message: {
				id: "message-1",
				role: "user",
				parts: [{ type: "text", text: "" }],
			},
		});

		expect(() => parseAndValidateChatRequest(payload)).toThrow(
			ChatRequestError,
		);
	});

	test("rejects non-text message parts", () => {
		const payload = JSON.stringify({
			id: "chat-123",
			message: {
				id: "message-1",
				role: "user",
				parts: [{ type: "file", url: "https://example.com/file" }],
			},
		});

		expect(() => parseAndValidateChatRequest(payload)).toThrow(
			ChatRequestError,
		);
	});

	test("rejects oversized message content", () => {
		const payload = JSON.stringify({
			id: "chat-123",
			message: {
				id: "message-1",
				role: "user",
				parts: [{ type: "text", text: "x".repeat(2500) }],
			},
		});

		expect(() => parseAndValidateChatRequest(payload)).toThrow(
			ChatRequestError,
		);
	});

	test("rejects oversized request body", () => {
		const oversizedBody = "a".repeat(70 * 1024);
		const headers = new Headers({
			"content-length": `${oversizedBody.length}`,
		});

		expect(() => assertRequestBodySize(headers, oversizedBody)).toThrow(
			ChatRequestError,
		);
	});

	test("validates route chat IDs", () => {
		expect(validateRouteChatId("chat_abc-123")).toBe("chat_abc-123");
		expect(() => validateRouteChatId("../bad")).toThrow(ChatRequestError);
	});
});
