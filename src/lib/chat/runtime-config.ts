import { z } from "zod";

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
		AGENT_SYSTEM_PROMPT: optionalNonEmptyString,
		AGENT_SYSTEM_PROMPT_R2_KEY: optionalNonEmptyString,
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

function isR2Bucket(value: unknown): value is R2Bucket {
	return (
		typeof value === "object" &&
		value !== null &&
		"get" in value &&
		typeof (value as { get?: unknown }).get === "function"
	);
}

async function resolvePromptFromR2(
	rawEnv: unknown,
	objectKey: string,
): Promise<string> {
	const envRecord = rawEnv as Record<string, unknown>;
	const bucketCandidate = envRecord.AGENT_PROMPTS;
	if (!isR2Bucket(bucketCandidate)) {
		throw new Error(
			"AGENT_PROMPTS R2 binding is required when AGENT_SYSTEM_PROMPT_R2_KEY is set",
		);
	}

	const promptObject = await bucketCandidate.get(objectKey);
	if (!promptObject) {
		throw new Error(`Agent system prompt object not found in R2: ${objectKey}`);
	}

	const promptText = (await promptObject.text()).trim();
	if (!promptText) {
		throw new Error(`Agent system prompt object is empty: ${objectKey}`);
	}

	return promptText;
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

	const inlinePrompt = parsed.data.AGENT_SYSTEM_PROMPT;
	if (inlinePrompt) {
		return {
			mcpServerUrl: parsed.data.MCP_SERVER_URL,
			agentSystemPrompt: inlinePrompt,
		};
	}

	let r2Prompt: string | undefined;
	if (parsed.data.AGENT_SYSTEM_PROMPT_R2_KEY) {
		try {
			r2Prompt = await resolvePromptFromR2(
				rawEnv,
				parsed.data.AGENT_SYSTEM_PROMPT_R2_KEY,
			);
		} catch (error) {
			logPromptConfigWarning("Failed to resolve AGENT_SYSTEM_PROMPT from R2", {
				r2Key: parsed.data.AGENT_SYSTEM_PROMPT_R2_KEY,
				error: error instanceof Error ? error.message : "unknown",
			});
		}
	}

	return {
		mcpServerUrl: parsed.data.MCP_SERVER_URL,
		agentSystemPrompt: r2Prompt,
	};
}
