import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { validateUIMessages } from "ai";
import { tryCatch } from "@/lib/try-catch";
import * as schema from "@/services/auth/schema";
import { chatConversations } from "@/services/auth/schema";
import { normalizeConversationHistoryMessages } from "../messages/history";
import type { ConversationMessage, ConversationRecord } from "../types";

function getDatabase() {
	return drizzle(env.DB, { schema });
}

const MAX_SAVE_ATTEMPTS = 3;

type MutationResult = {
	meta?: {
		changes?: number;
	};
	changes?: number;
};

export class ConversationSaveConflictError extends Error {
	constructor(conversationId: string) {
		super(
			`Conversation ${conversationId} changed while a response was being persisted.`,
		);
		this.name = "ConversationSaveConflictError";
	}
}

export function createEmptyConversationRecord(
	conversationId: string = crypto.randomUUID(),
): ConversationRecord {
	return {
		conversationId,
		messages: [],
	};
}

async function parseStoredMessages(
	messagesJson: string,
): Promise<ConversationMessage[]> {
	const parsed = tryCatch(JSON.parse)(messagesJson);
	if (parsed.error) {
		return [];
	}

	try {
		const validatedMessages = await validateUIMessages<ConversationMessage>({
			messages: parsed.data,
		});

		return normalizeConversationHistoryMessages(validatedMessages);
	} catch {
		return [];
	}
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
		messages: await parseStoredMessages(conversation.messagesJson),
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
		messages: await parseStoredMessages(conversation.messagesJson),
	};
}

export async function saveConversationForUser(input: {
	userId: string;
	conversationId: string;
	messages: ConversationMessage[];
}): Promise<void> {
	const database = getDatabase();
	const messagesJson = JSON.stringify(input.messages);

	for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt += 1) {
		const existingConversation =
			await database.query.chatConversations.findFirst({
				where: eq(chatConversations.id, input.conversationId),
				columns: {
					id: true,
					userId: true,
					updatedAt: true,
				},
			});

		if (!existingConversation) {
			const insertResult = (await database
				.insert(chatConversations)
				.values({
					id: input.conversationId,
					userId: input.userId,
					messagesJson,
				})
				.onConflictDoNothing({ target: chatConversations.id })
				.execute()) as MutationResult;

			if (didAffectRows(insertResult)) {
				return;
			}

			continue;
		}

		if (existingConversation.userId !== input.userId) {
			throw new Error("Conversation does not belong to the active user.");
		}

		const updateResult = (await database
			.update(chatConversations)
			.set({
				messagesJson,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(chatConversations.id, input.conversationId),
					eq(chatConversations.userId, input.userId),
					eq(chatConversations.updatedAt, existingConversation.updatedAt),
				),
			)
			.execute()) as MutationResult;

		if (didAffectRows(updateResult)) {
			return;
		}
	}

	throw new ConversationSaveConflictError(input.conversationId);
}

function didAffectRows(result: MutationResult): boolean {
	return (result.meta?.changes ?? result.changes ?? 0) > 0;
}
