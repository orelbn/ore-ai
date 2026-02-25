import { chatMessages, chatSessions } from "@/db/schema/chat";
import { and, asc, desc, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import {
	CHAT_DEFAULT_TITLE,
	CHAT_PREVIEW_MAX_CHARS,
	CHAT_TITLE_MAX_CHARS,
} from "./constants";

export type ChatSummary = {
	id: string;
	title: string;
	updatedAt: number;
	lastMessagePreview: string;
};

export type ChatDetail = {
	id: string;
	title: string;
	messages: UIMessage[];
};

async function loadDb() {
	const { getDb } = await import("@/db");
	return getDb();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isUIMessageRole(value: string): value is UIMessage["role"] {
	return value === "user" || value === "assistant" || value === "system";
}

function extractTextFromParts(parts: UIMessage["parts"]): string {
	const text = parts
		.flatMap((part) => {
			if (part.type !== "text") {
				return [];
			}
			return [part.text];
		})
		.join("\n")
		.trim();

	return text;
}

function parseParts(partsJson: string): UIMessage["parts"] {
	try {
		const parsed = JSON.parse(partsJson);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.flatMap((entry) => {
			if (!isRecord(entry)) {
				return [];
			}

			if (entry.type !== "text" || typeof entry.text !== "string") {
				return [];
			}

			return [
				{
					type: "text" as const,
					text: entry.text,
				},
			];
		});
	} catch {
		return [];
	}
}

export function buildChatTitleFromMessage(message: UIMessage): string {
	const text = extractTextFromParts(message.parts);
	if (!text) {
		return CHAT_DEFAULT_TITLE;
	}

	return text.slice(0, CHAT_TITLE_MAX_CHARS);
}

function mapMessageRowToUiMessage(row: {
	id: string;
	role: string;
	partsJson: string;
}): UIMessage {
	const role = isUIMessageRole(row.role) ? row.role : "assistant";
	return {
		id: row.id,
		role,
		parts: parseParts(row.partsJson),
	};
}

export function getPersistedMessageId(input: {
	messageId: string;
	sessionId: string;
	role: UIMessage["role"];
	index: number;
}): string {
	const normalizedId = input.messageId.trim();
	if (normalizedId.length > 0) {
		return normalizedId;
	}

	return `${input.sessionId}:${input.role}:${input.index}:${crypto.randomUUID()}`;
}

export async function listChatSummariesForUser(
	userId: string,
): Promise<ChatSummary[]> {
	const db = await loadDb();
	const rows = await db
		.select({
			id: chatSessions.id,
			title: chatSessions.title,
			updatedAt: chatSessions.updatedAt,
			lastMessagePreview: chatSessions.lastMessagePreview,
		})
		.from(chatSessions)
		.where(eq(chatSessions.userId, userId))
		.orderBy(desc(chatSessions.lastMessageAt));

	return rows.map((row) => ({
		id: row.id,
		title: row.title,
		updatedAt: row.updatedAt.getTime(),
		lastMessagePreview: row.lastMessagePreview,
	}));
}

export async function getChatSessionOwner(
	chatId: string,
): Promise<{ id: string; userId: string } | null> {
	const db = await loadDb();
	const row = await db
		.select({
			id: chatSessions.id,
			userId: chatSessions.userId,
		})
		.from(chatSessions)
		.where(eq(chatSessions.id, chatId))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	return row;
}

export async function createChatSession(input: {
	id: string;
	userId: string;
	title: string;
}) {
	const db = await loadDb();
	await db.insert(chatSessions).values({
		id: input.id,
		userId: input.userId,
		title: input.title,
		lastMessagePreview: "",
		lastMessageAt: new Date(),
		updatedAt: new Date(),
	});
}

export async function loadChatMessagesForUser(input: {
	chatId: string;
	userId: string;
}): Promise<UIMessage[]> {
	const db = await loadDb();
	const rows = await db
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

	return rows.map(mapMessageRowToUiMessage);
}

export async function loadRecentChatMessagesForUser(input: {
	chatId: string;
	userId: string;
	limit: number;
}): Promise<UIMessage[]> {
	const db = await loadDb();
	const rows = await db
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

	return rows.reverse().map(mapMessageRowToUiMessage);
}

export async function appendMessagesToChat(input: {
	chatId: string;
	userId: string;
	messages: UIMessage[];
	ipHash: string | null;
}) {
	if (input.messages.length === 0) {
		return;
	}

	const db = await loadDb();
	const rows = input.messages.map((message, index) => {
		const preview = extractTextFromParts(message.parts).slice(
			0,
			CHAT_PREVIEW_MAX_CHARS,
		);
		return {
			id: getPersistedMessageId({
				messageId: message.id,
				sessionId: input.chatId,
				role: message.role,
				index,
			}),
			sessionId: input.chatId,
			userId: input.userId,
			role: message.role,
			partsJson: JSON.stringify(message.parts),
			textPreview: preview,
			ipHash: message.role === "user" ? input.ipHash : null,
		};
	});

	await db.insert(chatMessages).values(rows).onConflictDoNothing({
		target: chatMessages.id,
	});

	const lastMessage = input.messages[input.messages.length - 1];
	const lastPreview = extractTextFromParts(lastMessage.parts).slice(
		0,
		CHAT_PREVIEW_MAX_CHARS,
	);
	await db
		.update(chatSessions)
		.set({
			lastMessagePreview: lastPreview,
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

export async function loadChatForUser(input: {
	chatId: string;
	userId: string;
}): Promise<ChatDetail | null> {
	const db = await loadDb();
	const session = await db
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

	if (!session) {
		return null;
	}

	const messages = await loadChatMessagesForUser(input);
	return {
		id: session.id,
		title: session.title,
		messages,
	};
}

export async function deleteChatForUser(input: {
	chatId: string;
	userId: string;
}): Promise<boolean> {
	const existing = await loadChatForUser(input);
	if (!existing) {
		return false;
	}

	const db = await loadDb();
	await db
		.delete(chatSessions)
		.where(
			and(
				eq(chatSessions.id, input.chatId),
				eq(chatSessions.userId, input.userId),
			),
		);

	return true;
}
