import type {
	OreAgentOptions,
	OreAgentUIMessage,
} from "@/services/google-ai/ore-agent";
import { createOreAgent } from "@/services/google-ai/ore-agent";
import {
	resolveOreAiMcpTools,
	type OreAiMcpServiceBinding,
} from "@/services/mcp/ore-ai-mcp-tools";
import type { UIMessage } from "ai";
import { createAgentUIStreamResponse, validateUIMessages } from "ai";
import { extractPlainTextFromParts } from "../../messages/content";
import { createServerGeneratedMessageMetadata } from "../message-integrity";

type ResolveMcpTools = typeof resolveOreAiMcpTools;
type StreamAssistantReplyInput = {
	requestId: string;
	agentOptions: OreAgentOptions;
	conversationId: string;
	messages: UIMessage[];
	actorId: string;
	mcpServiceBinding: OreAiMcpServiceBinding;
	mcpInternalSecret: string;
	mcpServerUrl: string;
	agentSystemPrompt?: string;
	messageIntegritySecret: string;
	sessionBindingId: string;
	resolveMcpTools?: ResolveMcpTools;
};

export async function streamAssistantReply(
	input: StreamAssistantReplyInput,
): Promise<Response> {
	const validatedMessages = (await validateUIMessages({
		messages: input.messages,
	})) satisfies OreAgentUIMessage[];

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
	const assistantTextState = createAssistantTextState();

	try {
		return createAgentUIStreamResponse({
			agent,
			uiMessages: validatedMessages,
			originalMessages: validatedMessages,
			generateMessageId: () => responseMessageId,
			messageMetadata: ({ part }) => {
				if (part.type === "text-start") {
					assistantTextState.startTextPart(part.id);
					return undefined;
				}

				if (part.type === "text-delta") {
					assistantTextState.appendTextDelta(part.id, part.text);
					return undefined;
				}

				if (part.type === "text-end") {
					assistantTextState.endTextPart(part.id);
					return undefined;
				}

				const normalizedAssistantText =
					assistantTextState.getNormalizedAssistantText();
				if (part.type !== "finish" || normalizedAssistantText.length === 0) {
					return undefined;
				}

				return createServerGeneratedMessageMetadata({
					message: {
						id: responseMessageId,
						role: "assistant",
						parts: [{ type: "text", text: normalizedAssistantText }],
					},
					conversationId: input.conversationId,
					secret: input.messageIntegritySecret,
					sessionBindingId: input.sessionBindingId,
				});
			},
			onFinish: async () => {
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

type AssistantTextPart = {
	type: "text";
	text: string;
};

function createAssistantTextState() {
	const textParts: AssistantTextPart[] = [];
	const activeTextParts = new Map<string, AssistantTextPart>();

	return {
		startTextPart(partId: string) {
			const textPart: AssistantTextPart = { type: "text", text: "" };
			textParts.push(textPart);
			activeTextParts.set(partId, textPart);
		},
		appendTextDelta(partId: string, delta: string) {
			const textPart = activeTextParts.get(partId);
			if (!textPart) {
				return;
			}

			textPart.text += delta;
		},
		endTextPart(partId: string) {
			activeTextParts.delete(partId);
		},
		getNormalizedAssistantText() {
			return extractPlainTextFromParts(textParts);
		},
	};
}
