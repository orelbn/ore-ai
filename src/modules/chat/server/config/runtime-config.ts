import { z } from "zod";
import { createR2PromptStorage } from "./prompt-storage-r2";
import { getPromptFromStorage } from "./prompt-storage";

const optionalNonEmptyString = z.preprocess((value) => {
	if (typeof value !== "string") {
		return value;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());

const chatRuntimeEnvSchema = z
	.object({
		MCP_SERVER_URL: z.string().trim().url(),
		AGENT_PROMPT_KEY: optionalNonEmptyString,
	})
	.passthrough();

export interface ChatRuntimeConfig {
	mcpServerUrl: string;
	agentSystemPrompt?: string;
}

function logPromptConfigWarning(
	message: string,
	details: Record<string, unknown>,
) {
	console.warn(
		JSON.stringify({
			scope: "chat_runtime_config",
			level: "warn",
			message,
			...details,
		}),
	);
}

export async function resolveChatRuntimeConfig(
	rawEnv: unknown,
): Promise<ChatRuntimeConfig> {
	const parsed = chatRuntimeEnvSchema.safeParse(rawEnv);
	if (!parsed.success) {
		const details = parsed.error.issues
			.map((issue) => {
				const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
				return `${path}: ${issue.message}`;
			})
			.join("; ");
		throw new Error(`Invalid chat runtime config: ${details}`);
	}

	let storagePrompt: string | undefined;
	if (parsed.data.AGENT_PROMPT_KEY) {
		try {
			const storage = createR2PromptStorage(rawEnv);
			storagePrompt = await getPromptFromStorage(
				storage,
				parsed.data.AGENT_PROMPT_KEY,
			);
		} catch (error) {
			logPromptConfigWarning(
				"Failed to resolve AGENT_SYSTEM_PROMPT from storage",
				{
					promptKey: parsed.data.AGENT_PROMPT_KEY,
					error: error instanceof Error ? error.message : "unknown",
				},
			);
		}
	}

	return {
		mcpServerUrl: parsed.data.MCP_SERVER_URL,
		agentSystemPrompt: storagePrompt,
	};
}
