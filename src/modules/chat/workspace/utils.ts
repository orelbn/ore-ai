import type { ConversationMessage } from "../types";
import { extractPlainTextFromParts } from "../messages/content";

export function extractPlainText(parts: ConversationMessage["parts"]): string {
	return extractPlainTextFromParts(parts);
}
