import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createOreAgent } from "@/services/google-ai/ore-agent.ts";
import { resolveEvalConfig } from "./eval-env-config";

export function createEvalAgent() {
	const promptPath = resolve(
		process.cwd(),
		".prompts",
		"agent-system-prompt.md",
	);
	const systemPrompt = readFileSync(promptPath, "utf8");
	const config = resolveEvalConfig();
	return createOreAgent(
		{
			googleApiKey: config.googleApiKey,
			model: config.model,
		},
		{},
		systemPrompt,
	);
}
