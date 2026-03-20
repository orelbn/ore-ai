import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { UIMessage } from "ai";
import { tryCatch } from "@/lib/try-catch";
import * as schema from "@/services/auth/schema";
import { chatConversations } from "@/services/auth/schema";
import { normalizeConversationHistoryMessages } from "../messages/history";
import type { ConversationMessage, ConversationRecord } from "../types";

function getDatabase() {
	return drizzle(env.DB, { schema });
}

export function createEmptyConversationRecord(
	conversationId = crypto.randomUUID(),
): ConversationRecord {
	return {
		conversationId,
		messages: [],
	};
}

function toConversationMessages(messages: UIMessage[]): ConversationMessage[] {
	return messages.map((message) => ({
		id: message.id,
		role: message.role as ConversationMessage["role"],
		parts: message.parts.flatMap((part) =>
			part.type === "text"
				? [
						{
							type: "text" as const,
							text: part.text,
						},
					]
				: [],
		),
	}));
}

function parseStoredMessages(messagesJson: string): ConversationMessage[] {
	const parsed = tryCatch(JSON.parse)(messagesJson);
	if (parsed.error || !Array.isArray(parsed.data)) {
		return [];
	}

	return toConversationMessages(
		normalizeConversationHistoryMessages(parsed.data as UIMessage[]),
	);
}

export async function loadLatestConversationForUser(
	userId: string,
): Promise<ConversationRecord | null> {
	const database = getDatabase();
	const conversation = await database.query.chatConversations.findFirst({
		where: eq(chatConversations.userId, userId),
		orderBy: (table) => [desc(table.updatedAt)],
	});
	if (!conversation) {
		return null;
	}

	return {
		conversationId: conversation.id,
		messages: parseStoredMessages(conversation.messagesJson),
	};
}

export async function loadConversationForUser(input: {
	userId: string;
	conversationId: string;
}): Promise<ConversationRecord | null> {
	const database = getDatabase();
	const conversation = await database.query.chatConversations.findFirst({
		where: and(
			eq(chatConversations.userId, input.userId),
			eq(chatConversations.id, input.conversationId),
		),
	});
	if (!conversation) {
		return null;
	}

	return {
		conversationId: conversation.id,
		messages: parseStoredMessages(conversation.messagesJson),
	};
}

export async function saveConversationForUser(input: {
	userId: string;
	conversationId: string;
	messages: UIMessage[];
}): Promise<void> {
	const database = getDatabase();
	const normalizedMessages = toConversationMessages(
		normalizeConversationHistoryMessages(input.messages),
	);
	const messagesJson = JSON.stringify(normalizedMessages);
	const existingConversation = await database.query.chatConversations.findFirst(
		{
			where: eq(chatConversations.id, input.conversationId),
			columns: {
				id: true,
				userId: true,
			},
		},
	);

	if (!existingConversation) {
		await database.insert(chatConversations).values({
			id: input.conversationId,
			userId: input.userId,
			messagesJson,
		});
		return;
	}

	if (existingConversation.userId !== input.userId) {
		throw new Error("Conversation does not belong to the active user.");
	}

	await database
		.update(chatConversations)
		.set({
			messagesJson,
			updatedAt: new Date(),
		})
		.where(eq(chatConversations.id, input.conversationId));
}
