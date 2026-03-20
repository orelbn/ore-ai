import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";
import { CHAT_PREVIEW_MAX_CHARS, CHAT_TITLE_MAX_CHARS } from "../constants";
import {
	buildPreviewFromInput,
	buildPreviewFromParts,
	buildTitleFromInput,
	buildTitleFromMessage,
	extractPlainTextFromParts,
} from "./content";

describe("chat content helpers", () => {
	test("extractPlainTextFromParts keeps only text parts and trims result", () => {
		const text = extractPlainTextFromParts([
			{ type: "text", text: " first " },
			{ type: "reasoning", text: "ignore" },
			{ type: "text", text: "second" },
		]);

		expect(text).toBe("first \nsecond");
	});

	test("buildTitleFromInput uses fallback for empty values", () => {
		expect(buildTitleFromInput("   ", "fallback")).toBe("fallback");
	});

	test("buildTitleFromInput truncates to title limit", () => {
		expect(buildTitleFromInput("x".repeat(200)).length).toBe(
			CHAT_TITLE_MAX_CHARS,
		);
	});

	test("buildTitleFromMessage derives title from message parts", () => {
		const message: Pick<UIMessage, "parts"> = {
			parts: [{ type: "text", text: "Plan sprint" }],
		};

		expect(buildTitleFromMessage(message)).toBe("Plan sprint");
	});

	test("buildPreview helpers truncate at preview limit", () => {
		expect(buildPreviewFromInput("y".repeat(500)).length).toBe(
			CHAT_PREVIEW_MAX_CHARS,
		);
		expect(
			buildPreviewFromParts([{ type: "text", text: "y".repeat(500) }]).length,
		).toBe(CHAT_PREVIEW_MAX_CHARS);
	});
});
