import {
	createEmptyConversationRecord,
	loadLatestConversationForUser,
} from "../repo/conversations";
import type { ConversationRecord } from "../types";

export function createEmptyConversationSeed(
	conversationId?: string,
): ConversationRecord {
	return createEmptyConversationRecord(conversationId);
}

export async function loadLatestConversationSeed(
	userId: string,
): Promise<ConversationRecord> {
	return (
		(await loadLatestConversationForUser(userId)) ??
		createEmptyConversationSeed()
	);
}
