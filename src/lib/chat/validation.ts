import type { UIMessage } from "ai";
import {
	CHAT_ID_PATTERN,
	CHAT_MAX_BODY_BYTES,
	CHAT_MAX_ID_LENGTH,
	CHAT_MAX_MESSAGE_CHARS,
} from "./constants";

export class ChatRequestError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = "ChatRequestError";
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function validateChatId(rawId: unknown): string {
	if (typeof rawId !== "string") {
		throw new ChatRequestError("Invalid chat id.", 400);
	}

	const chatId = rawId.trim();
	if (
		!chatId ||
		chatId.length > CHAT_MAX_ID_LENGTH ||
		!CHAT_ID_PATTERN.test(chatId)
	) {
		throw new ChatRequestError("Invalid chat id.", 400);
	}

	return chatId;
}

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

function validateUserMessage(rawMessage: unknown): UIMessage {
	if (!isRecord(rawMessage)) {
		throw new ChatRequestError("Invalid message payload.", 400);
	}

	const messageId = rawMessage.id;
	const role = rawMessage.role;
	const parts = rawMessage.parts;

	if (typeof messageId !== "string" || !messageId.trim()) {
		throw new ChatRequestError("Invalid message payload.", 400);
	}

	if (role !== "user") {
		throw new ChatRequestError("Only user messages are allowed.", 400);
	}

	if (!Array.isArray(parts) || parts.length === 0) {
		throw new ChatRequestError(
			"Message must include at least one text part.",
			400,
		);
	}

	let totalChars = 0;
	const validatedParts = parts.map((part) => {
		if (
			!isRecord(part) ||
			part.type !== "text" ||
			typeof part.text !== "string"
		) {
			throw new ChatRequestError(
				"Only plain text message parts are allowed.",
				400,
			);
		}

		totalChars += part.text.length;
		if (totalChars > CHAT_MAX_MESSAGE_CHARS) {
			throw new ChatRequestError("Message exceeds maximum length.", 413);
		}

		return {
			type: "text" as const,
			text: part.text,
		};
	});

	if (totalChars === 0) {
		throw new ChatRequestError("Message cannot be empty.", 400);
	}

	return {
		id: messageId,
		role: "user",
		parts: validatedParts,
	};
}

export function parseAndValidateChatRequest(rawBody: string): {
	id: string;
	message: UIMessage;
} {
	let parsed: unknown;

	try {
		parsed = JSON.parse(rawBody);
	} catch {
		throw new ChatRequestError("Invalid JSON payload.", 400);
	}

	if (!isRecord(parsed)) {
		throw new ChatRequestError("Invalid request payload.", 400);
	}

	return {
		id: validateChatId(parsed.id),
		message: validateUserMessage(parsed.message),
	};
}

export function validateRouteChatId(chatId: string): string {
	return validateChatId(chatId);
}
