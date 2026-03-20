import type { UIMessage } from "ai";
import type { ConversationMessage } from "../types";

export function normalizeConversationHistoryMessage(
	message: UIMessage,
): ConversationMessage | null {
	if (message.role === "system") {
		return null;
	}

	return message as ConversationMessage;
}

export function normalizeConversationHistoryMessages(
	messages: UIMessage[],
): ConversationMessage[] {
	return messages.flatMap((message) => {
		const normalized = normalizeConversationHistoryMessage(message);
		return normalized ? [normalized] : [];
	});
}
