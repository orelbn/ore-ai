import { describe, expect, test } from "vitest";
import { buildRetriedChatRequest } from "./retry-request";

describe("chat retry request", () => {
	test("should rebuild the request with only the latest user message when assistant history is present", () => {
		const retriedRequest = buildRetriedChatRequest({
			conversationId: "conversation-2",
			body: JSON.stringify({
				conversationId: "conversation-1",
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "hello" }],
					},
					{
						id: "assistant-1",
						role: "assistant",
						parts: [{ type: "text", text: "Hi there" }],
					},
					{
						id: "user-2",
						role: "user",
						parts: [{ type: "text", text: "follow up" }],
					},
				],
			}),
		});

		expect(retriedRequest).toEqual({
			body: JSON.stringify({
				conversationId: "conversation-2",
				messages: [
					{
						id: "user-2",
						role: "user",
						parts: [{ type: "text", text: "follow up" }],
					},
				],
			}),
			latestUserMessage: {
				id: "user-2",
				role: "user",
				parts: [{ type: "text", text: "follow up" }],
			},
		});
	});

	test("should return null when the request body is malformed", () => {
		expect(
			buildRetriedChatRequest({
				conversationId: "conversation-2",
				body: "{bad json",
			}),
		).toBeNull();
	});

	test("should return null when the request body does not contain a user message", () => {
		expect(
			buildRetriedChatRequest({
				conversationId: "conversation-2",
				body: JSON.stringify({
					conversationId: "conversation-1",
					messages: [
						{
							id: "assistant-1",
							role: "assistant",
							parts: [{ type: "text", text: "Hi there" }],
						},
					],
				}),
			}),
		).toBeNull();
	});
});
