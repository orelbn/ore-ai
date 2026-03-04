import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createOreAgent } from "../src/lib/agents/ore-agent.ts";
import { createCloudflareAiBinding } from "./cloudflare-workers-ai-binding";
import { resolveEvalConfig } from "./eval-env-config";

export function createEvalAgent() {
	const promptPath = resolve(
		process.cwd(),
		".prompts",
		"agent-system-prompt.md",
	);
	const systemPrompt = readFileSync(promptPath, "utf8");
	const config = resolveEvalConfig();
	const binding = createCloudflareAiBinding(config);
	return createOreAgent(binding, {}, systemPrompt);
}
