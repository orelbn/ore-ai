import {
	createEmptyConversationSeed,
	type ConversationMessage,
	type ConversationRecord,
} from "@/modules/chat";

type HydratedConversationValue = {
	conversationId?: unknown;
	messages?: unknown;
};

export function hydrateInitialConversationSeed(
	serializedConversation: string,
): ConversationRecord {
	try {
		const parsed = JSON.parse(
			serializedConversation,
		) as HydratedConversationValue;
		if (typeof parsed.conversationId !== "string") {
			return createEmptyConversationSeed();
		}

		return {
			conversationId: parsed.conversationId,
			messages: Array.isArray(parsed.messages)
				? parsed.messages.filter(isHydratedConversationMessage)
				: [],
		};
	} catch {
		return createEmptyConversationSeed();
	}
}

function isHydratedConversationMessage(
	value: unknown,
): value is ConversationMessage {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		typeof value.id === "string" &&
		"role" in value &&
		(value.role === "assistant" ||
			value.role === "system" ||
			value.role === "user") &&
		"parts" in value &&
		Array.isArray(value.parts)
	);
}
