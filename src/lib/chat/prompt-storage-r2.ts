import type { PromptStorage } from "./prompt-storage";

const AGENT_PROMPTS_BINDING_NAME = "AGENT_PROMPTS";

function isR2Bucket(value: unknown): value is R2Bucket {
	return (
		typeof value === "object" &&
		value !== null &&
		"get" in value &&
		typeof (value as { get?: unknown }).get === "function"
	);
}

export function createR2PromptStorage(rawEnv: unknown): PromptStorage {
	const envRecord = rawEnv as Record<string, unknown>;
	const bucketCandidate = envRecord[AGENT_PROMPTS_BINDING_NAME];
	if (!isR2Bucket(bucketCandidate)) {
		throw new Error(
			`${AGENT_PROMPTS_BINDING_NAME} R2 binding is required when AGENT_PROMPT_KEY is set`,
		);
	}

	return {
		name: "R2",
		getText: async (key: string) => {
			const object = await bucketCandidate.get(key);
			if (!object) {
				return null;
			}
			return object.text();
		},
	};
}
