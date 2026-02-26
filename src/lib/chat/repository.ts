import {
	deleteChatSessionForUser,
	insertChatMessages,
	insertChatSession,
	queryChatMessagesForUser,
	queryChatSessionForUser,
	queryChatSessionOwner,
	queryChatSummariesByUser,
	queryRecentChatMessagesForUser,
	updateChatSessionActivity,
} from "@/db/query";
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isUIMessageRole(value: string): value is UIMessage["role"] {
	return value === "user" || value === "assistant" || value === "system";
}

function extractTextFromParts(parts: UIMessage["parts"]): string {
	const text = parts
		.flatMap((part) => (part.type === "text" ? [part.text] : []))
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
			if (!isRecord(entry)) return [];

			if (entry.type !== "text" || typeof entry.text !== "string") return [];

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
	const rows = await queryChatSummariesByUser(userId);

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
	return queryChatSessionOwner(chatId);
}

export async function createChatSession(input: {
	id: string;
	userId: string;
	title: string;
}) {
	await insertChatSession(input);
}

export async function loadChatMessagesForUser(input: {
	chatId: string;
	userId: string;
}): Promise<UIMessage[]> {
	const rows = await queryChatMessagesForUser(input);
	return rows.map(mapMessageRowToUiMessage);
}

export async function loadRecentChatMessagesForUser(input: {
	chatId: string;
	userId: string;
	limit: number;
}): Promise<UIMessage[]> {
	const rows = await queryRecentChatMessagesForUser(input);
	return rows.reverse().map(mapMessageRowToUiMessage);
}

export async function appendMessagesToChat(input: {
	chatId: string;
	userId: string;
	messages: UIMessage[];
	ipHash: string | null;
}) {
	if (input.messages.length === 0) return;

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

	await insertChatMessages(rows);

	const lastMessage = input.messages[input.messages.length - 1];
	const lastPreview = extractTextFromParts(lastMessage.parts).slice(
		0,
		CHAT_PREVIEW_MAX_CHARS,
	);
	await updateChatSessionActivity({
		chatId: input.chatId,
		userId: input.userId,
		lastMessagePreview: lastPreview,
	});
}

export async function loadChatForUser(input: {
	chatId: string;
	userId: string;
}): Promise<ChatDetail | null> {
	const session = await queryChatSessionForUser(input);
	if (!session) return null;

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
	if (!existing) return false;

	await deleteChatSessionForUser(input);
	return true;
}
