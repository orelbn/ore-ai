import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";
import { CHAT_DEFAULT_DRAFT_TITLE } from "./constants";
import {
	buildPreviewFromInput,
	buildTitleFromInput,
	extractPlainTextFromParts,
} from "../messages/content";

export function createSessionId() {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}

	return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function extractPlainText(parts: OreAgentUIMessage["parts"]): string {
	return extractPlainTextFromParts(parts);
}

export function buildSessionTitleFromInput(input: string): string {
	return buildTitleFromInput(input, CHAT_DEFAULT_DRAFT_TITLE);
}

export function buildSessionPreviewFromInput(input: string): string {
	return buildPreviewFromInput(input);
}

export function formatUpdatedAt(timestamp: number): string {
	return new Date(timestamp).toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
