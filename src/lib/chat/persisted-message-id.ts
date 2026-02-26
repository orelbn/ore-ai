import type { UIMessage } from "ai";

export function getPersistedMessageId(input: {
	messageId: string;
	sessionId: string;
	role: UIMessage["role"];
	index: number;
}): string {
	const normalizedId = input.messageId.trim();
	if (normalizedId.length > 0) return normalizedId;

	return `${input.sessionId}:${input.role}:${input.index}:${crypto.randomUUID()}`;
}
