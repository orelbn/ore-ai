import { describe, expect, test } from "vitest";
import { createR2PromptStorage } from "./prompt-storage-r2";

describe("createR2PromptStorage", () => {
	test("throws when AGENT_PROMPTS binding is missing", () => {
		expect(() => createR2PromptStorage({})).toThrow(
			"AGENT_PROMPTS R2 binding is required when AGENT_PROMPT_KEY is set",
		);
	});

	test("returns null when key is missing in bucket", async () => {
		const storage = createR2PromptStorage({
			AGENT_PROMPTS: {
				get: async () => null,
			},
		});

		await expect(storage.getText("prompts/missing.txt")).resolves.toBeNull();
	});

	test("returns object text when key exists", async () => {
		const storage = createR2PromptStorage({
			AGENT_PROMPTS: {
				get: async () => ({
					text: async () => "prompt from bucket",
				}),
			},
		});

		expect(storage.name).toBe("R2");
		await expect(storage.getText("prompts/prod.txt")).resolves.toBe(
			"prompt from bucket",
		);
	});
});
