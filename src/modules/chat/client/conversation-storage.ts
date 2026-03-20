import { tryCatch } from "@/lib/try-catch";
import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";
import { normalizeConversationHistoryMessages } from "../messages/history";
import { z } from "zod";
import { CHAT_STORAGE_MAX_BYTES } from "../workspace/constants";
import {
	getSerializedByteSize,
	trimMessagesToByteBudget,
} from "./context-window";

const STORAGE_KEY = "ore-ai:chat-session:v1";
const STORAGE_VERSION = 1;

export type StoredConversationSnapshot = {
	conversationId: string;
	messages: OreAgentUIMessage[];
};

type StoredConversationV1 = StoredConversationSnapshot & {
	version: 1;
};

const oreAgentMessageSchema = z.custom<OreAgentUIMessage>((value) => {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		typeof value.id === "string" &&
		"role" in value &&
		(value.role === "system" ||
			value.role === "user" ||
			value.role === "assistant") &&
		"parts" in value &&
		Array.isArray(value.parts)
	);
});

const storedConversationSchema = z.object({
	version: z.literal(STORAGE_VERSION),
	conversationId: z.string().trim().min(1),
	messages: z.array(oreAgentMessageSchema),
});

function getStorage(): Storage | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

function buildStoredConversation(
	conversationId: string,
	messages: OreAgentUIMessage[],
): StoredConversationV1 {
	return {
		version: STORAGE_VERSION,
		conversationId,
		messages,
	};
}

export function createConversationSnapshot(): StoredConversationSnapshot {
	return {
		conversationId: crypto.randomUUID(),
		messages: [],
	};
}

function removeStoredConversation(storage: Storage) {
	void tryCatch(storage.removeItem.bind(storage))(STORAGE_KEY);
}

export function readStoredConversation(): StoredConversationSnapshot {
	const storage = getStorage();
	if (!storage) {
		return createConversationSnapshot();
	}

	const rawValue = tryCatch(storage.getItem.bind(storage))(STORAGE_KEY);
	if (rawValue.error || !rawValue.data) {
		return createConversationSnapshot();
	}

	const parsed = tryCatch(JSON.parse)(rawValue.data);
	if (parsed.error) {
		removeStoredConversation(storage);
		return createConversationSnapshot();
	}

	const validated = storedConversationSchema.safeParse(parsed.data);
	if (!validated.success) {
		removeStoredConversation(storage);
		return createConversationSnapshot();
	}

	return {
		conversationId: validated.data.conversationId,
		messages: normalizeConversationHistoryMessages(validated.data.messages),
	};
}

export function readConversationForSession(
	hasActiveSession: boolean,
): StoredConversationSnapshot {
	if (hasActiveSession) {
		return readStoredConversation();
	}

	clearStoredConversation();
	return createConversationSnapshot();
}

export function clearStoredConversation() {
	const storage = getStorage();
	if (!storage) {
		return;
	}

	removeStoredConversation(storage);
}

export function persistConversation(input: StoredConversationSnapshot) {
	const storage = getStorage();
	if (!storage) {
		return;
	}

	let nextMessages = trimMessagesToByteBudget({
		messages: normalizeConversationHistoryMessages(input.messages),
		maxBytes: CHAT_STORAGE_MAX_BYTES,
	});

	while (nextMessages.length > 0) {
		const persisted = tryCatch(storage.setItem.bind(storage))(
			STORAGE_KEY,
			JSON.stringify(
				buildStoredConversation(input.conversationId, nextMessages),
			),
		);
		if (!persisted.error) {
			return;
		}

		const trimmedMessages = trimMessagesToByteBudget({
			messages: nextMessages.slice(1),
			maxBytes: Math.max(
				Math.floor(getSerializedByteSize(nextMessages) / 2),
				1024,
			),
		});

		if (trimmedMessages.length >= nextMessages.length) {
			nextMessages = nextMessages.slice(-1);
			continue;
		}

		nextMessages = trimmedMessages;
	}

	removeStoredConversation(storage);
}
