export interface PromptStorage {
	readonly name: string;
	getText(key: string): Promise<string | null>;
}

export async function getPromptFromStorage(
	storage: PromptStorage,
	key: string,
): Promise<string> {
	const storedValue = await storage.getText(key);
	if (storedValue === null) {
		throw new Error(`Prompt key not found in ${storage.name}: ${key}`);
	}

	const prompt = storedValue.trim();
	if (!prompt) {
		throw new Error(`Prompt value is empty in ${storage.name}: ${key}`);
	}

	return prompt;
}
