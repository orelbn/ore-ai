import { type InferAgentUIMessage, type ToolSet, ToolLoopAgent } from "ai";
import { createWorkersAI } from "workers-ai-provider";

const DEFAULT_AGENT_SYSTEM_PROMPT = `You are a helpful AI assistant.

Style:
- Be concise, direct, and practical.
- Prefer clear answers with useful next steps when appropriate.
- Admit uncertainty instead of guessing.

Behavior:
- Stay factual and do not invent details.
- Use tool results as the source of truth when available.
- Keep potentially risky advice cautious and non-prescriptive.
- Output plain text only.`;

function resolveInstructions(overrideSystemPrompt?: string): string {
	const value = overrideSystemPrompt?.trim();
	if (!value) {
		return DEFAULT_AGENT_SYSTEM_PROMPT;
	}
	return value;
}

export function createOreAgent(
	binding: Ai,
	tools: ToolSet = {},
	overrideSystemPrompt?: string,
) {
	const workersAI = createWorkersAI({
		binding,
	});

	return new ToolLoopAgent({
		model: workersAI("@cf/openai/gpt-oss-120b"),
		instructions: resolveInstructions(overrideSystemPrompt),
		tools,
	});
}

export type OreAgentUIMessage = InferAgentUIMessage<
	ReturnType<typeof createOreAgent>
>;
