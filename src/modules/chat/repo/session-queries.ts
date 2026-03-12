import { getDB } from "@/db";
import { chatSessions } from "@/db/schema/chat";
import { and, desc, eq } from "drizzle-orm";

export async function queryChatSummariesByUser(userId: string) {
	const db = await getDB();
	return db
		.select({
			id: chatSessions.id,
			title: chatSessions.title,
			updatedAt: chatSessions.updatedAt,
			lastMessagePreview: chatSessions.lastMessagePreview,
		})
		.from(chatSessions)
		.where(eq(chatSessions.userId, userId))
		.orderBy(desc(chatSessions.lastMessageAt));
}

export async function queryChatSessionOwner(chatId: string) {
	const db = await getDB();
	return db
		.select({
			id: chatSessions.id,
			userId: chatSessions.userId,
		})
		.from(chatSessions)
		.where(eq(chatSessions.id, chatId))
		.limit(1)
		.then((rows) => rows[0] ?? null);
}

export async function insertChatSession(input: {
	id: string;
	userId: string;
	title: string;
}) {
	const db = await getDB();
	await db.insert(chatSessions).values({
		id: input.id,
		userId: input.userId,
		title: input.title,
		lastMessagePreview: "",
		lastMessageAt: new Date(),
		updatedAt: new Date(),
	});
}

export async function updateChatSessionActivity(input: {
	chatId: string;
	userId: string;
	lastMessagePreview: string;
}) {
	const db = await getDB();
	await db
		.update(chatSessions)
		.set({
			lastMessagePreview: input.lastMessagePreview,
			lastMessageAt: new Date(),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(chatSessions.id, input.chatId),
				eq(chatSessions.userId, input.userId),
			),
		);
}

export async function queryChatSessionForUser(input: {
	chatId: string;
	userId: string;
}) {
	const db = await getDB();
	return db
		.select({
			id: chatSessions.id,
			title: chatSessions.title,
		})
		.from(chatSessions)
		.where(
			and(
				eq(chatSessions.id, input.chatId),
				eq(chatSessions.userId, input.userId),
			),
		)
		.limit(1)
		.then((rows) => rows[0] ?? null);
}

export async function deleteChatSessionForUser(input: {
	chatId: string;
	userId: string;
}) {
	const db = await getDB();
	await db
		.delete(chatSessions)
		.where(
			and(
				eq(chatSessions.id, input.chatId),
				eq(chatSessions.userId, input.userId),
			),
		);
}
