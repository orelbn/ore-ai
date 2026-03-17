import type { UIMessage } from "ai";
import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";
import { extractPlainTextFromParts } from "./content";
import { parseServerGeneratedMessageMetadata } from "./server-message-metadata";

export function normalizeConversationHistoryMessage(
	message: OreAgentUIMessage,
): OreAgentUIMessage | null;
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
	const metadata = parseServerGeneratedMessageMetadata(message.metadata);
	if (!text || !metadata) {
		return null;
	}

	return {
		id: message.id,
		role: "assistant",
		parts: [{ type: "text", text }],
		metadata,
	};
}

export function normalizeConversationHistoryMessages(
	messages: OreAgentUIMessage[],
): OreAgentUIMessage[];
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
