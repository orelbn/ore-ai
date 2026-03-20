import type { UIMessage } from "ai";
import { z } from "zod";
import { tryCatch } from "@/lib/try-catch";
import { ChatRequestError } from "../errors/chat-request-error";
import {
	CHAT_MAX_BODY_BYTES,
	CHAT_MAX_MESSAGE_CHARS,
} from "../server/constants";
export { ChatRequestError } from "../errors/chat-request-error";

const uiMessageSchema = z.custom<UIMessage>((value) => {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		typeof value.id === "string" &&
		"role" in value &&
		(value.role === "system" ||
			value.role === "user" ||
			value.role === "assistant") &&
		"parts" in value &&
		Array.isArray(value.parts)
	);
});

const chatRequestSchema = z.object({
	conversationId: z.string().trim().min(1),
	message: uiMessageSchema,
});

export function assertRequestBodySize(headers: Headers, rawBody: string) {
	const contentLength = headers.get("content-length");
	if (contentLength) {
		const lengthValue = Number.parseInt(contentLength, 10);
		if (Number.isFinite(lengthValue) && lengthValue > CHAT_MAX_BODY_BYTES) {
			throw new ChatRequestError("Request body is too large.", 413);
		}
	}

	const encodedLength = new TextEncoder().encode(rawBody).byteLength;
	if (encodedLength > CHAT_MAX_BODY_BYTES) {
		throw new ChatRequestError("Request body is too large.", 413);
	}
}

function validateUserMessage(message: UIMessage): UIMessage {
	if (message.role !== "user") {
		return message;
	}

	if (!Array.isArray(message.parts) || message.parts.length === 0) {
		throw new ChatRequestError(
			"User messages must include at least one text part.",
			400,
		);
	}

	let totalChars = 0;
	for (const part of message.parts) {
		if (part.type !== "text") {
			throw new ChatRequestError(
				"Only plain text user messages are allowed.",
				400,
			);
		}

		totalChars += part.text.length;
		if (totalChars > CHAT_MAX_MESSAGE_CHARS) {
			throw new ChatRequestError("Message exceeds maximum length.", 413);
		}
	}

	if (totalChars === 0) {
		throw new ChatRequestError("Message cannot be empty.", 400);
	}

	return message;
}

export function parseAndValidateChatRequest(rawBody: string): {
	conversationId: string;
	message: UIMessage;
} {
	const payload = tryCatch(JSON.parse)(rawBody);
	if (payload.error) {
		throw new ChatRequestError("Invalid JSON payload.", 400);
	}

	const parsed = chatRequestSchema.safeParse(payload.data);
	if (!parsed.success) {
		throw new ChatRequestError("Invalid request payload.", 400);
	}

	if (parsed.data.message.role === "assistant") {
		throw new ChatRequestError(
			"Assistant messages are not accepted from the client.",
			400,
		);
	}

	if (parsed.data.message.role === "system") {
		throw new ChatRequestError("System messages are not allowed.", 400);
	}

	return {
		conversationId: parsed.data.conversationId,
		message: validateUserMessage(parsed.data.message),
	};
}
