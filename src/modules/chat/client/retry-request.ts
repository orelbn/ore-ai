import { tryCatch } from "@/lib/try-catch";
import { isRecord } from "@/lib/type-guards";
import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";

function isOreAgentUIMessage(value: unknown): value is OreAgentUIMessage {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		(value.role === "system" ||
			value.role === "user" ||
			value.role === "assistant") &&
		Array.isArray(value.parts)
	);
}

function readLatestUserMessage(
	body: BodyInit | null | undefined,
): OreAgentUIMessage | null {
	if (typeof body !== "string") {
		return null;
	}

	const parsed = tryCatch(JSON.parse)(body);
	if (parsed.error || !isRecord(parsed.data)) {
		return null;
	}

	const { messages } = parsed.data;
	if (!Array.isArray(messages)) {
		return null;
	}

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (isOreAgentUIMessage(message) && message.role === "user") {
			return message;
		}
	}

	return null;
}

export function buildRetriedChatRequest(input: {
	body: BodyInit | null | undefined;
	conversationId: string;
}): { body: string; latestUserMessage: OreAgentUIMessage } | null {
	const latestUserMessage = readLatestUserMessage(input.body);
	if (!latestUserMessage) {
		return null;
	}

	return {
		body: JSON.stringify({
			conversationId: input.conversationId,
			messages: [latestUserMessage],
		}),
		latestUserMessage,
	};
}
