import { describe, expect, test } from "vitest";
import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";
import { CHAT_PREVIEW_MAX_CHARS, CHAT_TITLE_MAX_CHARS } from "./constants";
import {
	buildSessionPreviewFromInput,
	buildSessionTitleFromInput,
	extractPlainText,
} from "./utils";

describe("workspace utils", () => {
	test("extractPlainText keeps only text message parts", () => {
		const parts = [
			{ type: "text", text: "first line" },
			{ type: "reasoning", text: "internal" },
			{ type: "text", text: "second line" },
		] as unknown as OreAgentUIMessage["parts"];

		expect(extractPlainText(parts)).toBe("first line\nsecond line");
	});

	test("buildSessionTitleFromInput uses fallback and truncates", () => {
		expect(buildSessionTitleFromInput("   ")).toBe("New session");
		expect(buildSessionTitleFromInput("a".repeat(120)).length).toBe(
			CHAT_TITLE_MAX_CHARS,
		);
	});

	test("buildSessionPreviewFromInput truncates by preview limit", () => {
		expect(buildSessionPreviewFromInput("a".repeat(400)).length).toBe(
			CHAT_PREVIEW_MAX_CHARS,
		);
	});
});
