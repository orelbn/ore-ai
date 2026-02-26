import { getDB } from "@/db";
import { chatMessages, chatSessions } from "@/db/schema/chat";
import { and, asc, desc, eq } from "drizzle-orm";

export async function queryChatMessagesForUser(input: {
	chatId: string;
	userId: string;
}) {
	const db = await getDB();
	return db
		.select({
			id: chatMessages.id,
			role: chatMessages.role,
			partsJson: chatMessages.partsJson,
		})
		.from(chatMessages)
		.innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
		.where(
			and(
				eq(chatMessages.sessionId, input.chatId),
				eq(chatSessions.userId, input.userId),
			),
		)
		.orderBy(asc(chatMessages.createdAt));
}

export async function queryRecentChatMessagesForUser(input: {
	chatId: string;
	userId: string;
	limit: number;
}) {
	const db = await getDB();
	return db
		.select({
			id: chatMessages.id,
			role: chatMessages.role,
			partsJson: chatMessages.partsJson,
		})
		.from(chatMessages)
		.innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
		.where(
			and(
				eq(chatMessages.sessionId, input.chatId),
				eq(chatSessions.userId, input.userId),
			),
		)
		.orderBy(desc(chatMessages.createdAt))
		.limit(input.limit);
}

export async function insertChatMessages(
	rows: Array<{
		id: string;
		sessionId: string;
		userId: string;
		role: "user" | "assistant" | "system";
		partsJson: string;
		textPreview: string;
		ipHash: string | null;
	}>,
) {
	const db = await getDB();
	await db.insert(chatMessages).values(rows).onConflictDoNothing({
		target: chatMessages.id,
	});
}
