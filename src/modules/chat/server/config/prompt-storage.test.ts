import { describe, expect, test } from "vitest";
import { getPromptFromStorage } from "./prompt-storage";

describe("getPromptFromStorage", () => {
	test("returns trimmed prompt text", async () => {
		const prompt = await getPromptFromStorage(
			{
				name: "Memory",
				getText: async () => "  Use concise answers.  ",
			},
			"prompts/default.txt",
		);

		expect(prompt).toBe("Use concise answers.");
	});

	test("throws when prompt key is missing", async () => {
		await expect(
			getPromptFromStorage(
				{
					name: "Memory",
					getText: async () => null,
				},
				"prompts/missing.txt",
			),
		).rejects.toThrow("Prompt key not found in Memory: prompts/missing.txt");
	});

	test("throws when prompt value is empty", async () => {
		await expect(
			getPromptFromStorage(
				{
					name: "Memory",
					getText: async () => "  ",
				},
				"prompts/empty.txt",
			),
		).rejects.toThrow("Prompt value is empty in Memory: prompts/empty.txt");
	});
});
