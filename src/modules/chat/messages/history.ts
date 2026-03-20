import type { UIMessage } from "ai";
import { extractPlainTextFromParts } from "./content";

export function normalizeConversationHistoryMessage(
	message: UIMessage,
): UIMessage | null;
export function normalizeConversationHistoryMessage(
	message: UIMessage,
): UIMessage | null {
	if (message.role === "system") {
		return null;
	}

	if (message.role === "user") {
		return message;
	}

	const text = extractPlainTextFromParts(message.parts);
	if (!text) {
		return null;
	}

	return {
		id: message.id,
		role: "assistant",
		parts: [{ type: "text", text }],
	};
}

export function normalizeConversationHistoryMessages(
	messages: UIMessage[],
): UIMessage[];
export function normalizeConversationHistoryMessages(
	messages: UIMessage[],
): UIMessage[] {
	return messages.flatMap((message) => {
		const normalized = normalizeConversationHistoryMessage(message);
		return normalized ? [normalized] : [];
	});
}
