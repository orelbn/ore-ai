import type { UIMessage } from "ai";
import { CHAT_DEFAULT_TITLE } from "../server/constants";
import { CHAT_PREVIEW_MAX_CHARS, CHAT_TITLE_MAX_CHARS } from "../constants";

type TextMessagePart = {
	type?: unknown;
	text?: unknown;
};

export function extractPlainTextFromParts(
	parts: readonly TextMessagePart[],
): string {
	return parts
		.flatMap((part) => {
			if (part.type !== "text" || typeof part.text !== "string") {
				return [];
			}
			return [part.text];
		})
		.join("\n")
		.trim();
}

export function buildTitleFromInput(
	input: string,
	fallbackTitle = CHAT_DEFAULT_TITLE,
): string {
	const value = input.trim();
	if (!value) {
		return fallbackTitle;
	}

	return value.slice(0, CHAT_TITLE_MAX_CHARS);
}

export function buildTitleFromMessage(
	message: Pick<UIMessage, "parts">,
	fallbackTitle = CHAT_DEFAULT_TITLE,
): string {
	return buildTitleFromInput(
		extractPlainTextFromParts(message.parts),
		fallbackTitle,
	);
}

export function buildPreviewFromInput(input: string): string {
	return input.slice(0, CHAT_PREVIEW_MAX_CHARS);
}

export function buildPreviewFromParts(
	parts: readonly TextMessagePart[],
): string {
	return buildPreviewFromInput(extractPlainTextFromParts(parts));
}
