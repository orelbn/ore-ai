import type { OreAgentOptions } from "@/services/google-ai/ore-agent";
import { createOreAgent } from "@/services/google-ai/ore-agent";
import {
	resolveOreAiMcpTools,
	type OreAiMcpServiceBinding,
} from "@/services/mcp/ore-ai-mcp-tools";
import { createAgentUIStreamResponse } from "ai";
import { normalizeConversationHistoryMessages } from "../../messages/history";
import type { ConversationMessage } from "../../types";

type ResolveMcpTools = typeof resolveOreAiMcpTools;
type StreamAssistantReplyInput = {
	requestId: string;
	agentOptions: OreAgentOptions;
	messages: ConversationMessage[];
	actorId: string;
	mcpServiceBinding: OreAiMcpServiceBinding;
	mcpInternalSecret: string;
	mcpServerUrl: string;
	agentSystemPrompt?: string;
	onFinishMessages?: (messages: ConversationMessage[]) => Promise<void>;
	resolveMcpTools?: ResolveMcpTools;
};

export async function streamAssistantReply(
	input: StreamAssistantReplyInput,
): Promise<Response> {
	const resolveMcpTools = input.resolveMcpTools ?? resolveOreAiMcpTools;
	const resolvedMcpTools = await resolveMcpTools({
		mcpServiceBinding: input.mcpServiceBinding,
		internalSecret: input.mcpInternalSecret,
		userId: input.actorId,
		requestId: input.requestId,
		mcpServerUrl: input.mcpServerUrl,
	});
	const closeMcpTools = createCloseOnce(resolvedMcpTools.close);
	const agent = createOreAgent(
		input.agentOptions,
		resolvedMcpTools.tools,
		input.agentSystemPrompt,
	);
	const responseMessageId = crypto.randomUUID();

	try {
		return createAgentUIStreamResponse({
			agent,
			uiMessages: input.messages,
			originalMessages: input.messages,
			generateMessageId: () => responseMessageId,
			onFinish: async ({ messages }) => {
				if (input.onFinishMessages) {
					await input.onFinishMessages(
						normalizeConversationHistoryMessages(messages),
					);
				}
				await closeMcpTools();
			},
			onError: () => {
				void closeMcpTools();
				return "Something went wrong while generating the response.";
			},
		});
	} catch (error) {
		await closeMcpTools();
		throw error;
	}
}

function createCloseOnce(close: () => Promise<void>) {
	let closePromise: Promise<void> | null = null;
	return async () => {
		if (!closePromise) closePromise = close();
		await closePromise;
	};
}
