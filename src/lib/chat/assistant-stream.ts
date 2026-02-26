import type { OreAgentUIMessage } from "@/lib/agents/ore-agent";
import { createOreAgent } from "@/lib/agents/ore-agent";
import {
	resolveOreAiMcpTools,
	type OreAiMcpServiceBinding,
} from "@/lib/agents/ore-ai-mcp-tools";
import type { UIMessage } from "ai";
import { createAgentUIStreamResponse, validateUIMessages } from "ai";
import { CHAT_CONTEXT_WINDOW_SIZE } from "./constants";
import { reportChatRouteError } from "./error-reporting";
import {
	appendMessagesToChat,
	buildChatTitleFromMessage,
	createChatSession,
	loadRecentChatMessagesForUser,
} from "./repository";

type ResolveMcpTools = typeof resolveOreAiMcpTools;
type StreamAssistantReplyInput = {
	request: Request;
	requestId: string;
	route: string;
	aiBinding: Ai;
	chatId: string;
	userId: string;
	message: UIMessage;
	ipHash: string | null;
	hasExistingSession: boolean;
	mcpServiceBinding: OreAiMcpServiceBinding;
	mcpInternalSecret: string;
	mcpServerUrl: string;
	agentSystemPrompt?: string;
	resolveMcpTools?: ResolveMcpTools;
};

function getLastIndexById(messages: UIMessage[], id: string): number {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.id === id) return index;
	}
	return -1;
}

function getLastUserIndex(messages: UIMessage[]): number {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.role === "user") return index;
	}
	return -1;
}

export function selectAssistantMessagesForCurrentTurn(input: {
	allMessages: UIMessage[];
	requestMessageId: string;
	knownMessageIds: Set<string>;
}): UIMessage[] {
	const requestIndex = getLastIndexById(
		input.allMessages,
		input.requestMessageId,
	);
	const lastUserIndex = getLastUserIndex(input.allMessages);
	const startIndex = requestIndex >= 0 ? requestIndex : lastUserIndex;
	const candidateSlice =
		startIndex >= 0
			? input.allMessages.slice(startIndex + 1)
			: input.allMessages;

	const selected: UIMessage[] = [];
	const seenIds = new Set<string>();
	for (const candidate of candidateSlice) {
		if (candidate.role !== "assistant") continue;
		if (!Array.isArray(candidate.parts) || candidate.parts.length === 0)
			continue;
		if (input.knownMessageIds.has(candidate.id) || seenIds.has(candidate.id))
			continue;
		seenIds.add(candidate.id);
		selected.push(candidate);
	}

	return selected;
}

export async function streamAssistantReply(
	input: StreamAssistantReplyInput,
): Promise<Response> {
	await ensureChatSession(input);

	const validatedMessages = await loadValidatedTurnMessages(input);
	await persistIncomingUserMessage(input);

	const knownMessageIds = new Set(validatedMessages.map((entry) => entry.id));
	const resolveMcpTools = input.resolveMcpTools ?? resolveOreAiMcpTools;
	const resolvedMcpTools = await resolveMcpTools({
		mcpServiceBinding: input.mcpServiceBinding,
		internalSecret: input.mcpInternalSecret,
		userId: input.userId,
		requestId: input.requestId,
		mcpServerUrl: input.mcpServerUrl,
	});
	const closeMcpTools = createCloseOnce(resolvedMcpTools.close);
	const agent = createOreAgent(
		input.aiBinding,
		resolvedMcpTools.tools,
		input.agentSystemPrompt,
	);
	const onFinish = createOnFinishHandler({
		streamInput: input,
		knownMessageIds,
		closeMcpTools,
	});

	try {
		return createAgentUIStreamResponse({
			agent,
			uiMessages: validatedMessages,
			originalMessages: validatedMessages,
			onFinish,
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

async function ensureChatSession(input: StreamAssistantReplyInput) {
	if (!input.hasExistingSession) {
		await createChatSession({
			id: input.chatId,
			userId: input.userId,
			title: buildChatTitleFromMessage(input.message),
		});
	}
}

async function loadValidatedTurnMessages(
	input: StreamAssistantReplyInput,
): Promise<OreAgentUIMessage[]> {
	const priorMessages = input.hasExistingSession
		? await loadRecentChatMessagesForUser({
				chatId: input.chatId,
				userId: input.userId,
				limit: CHAT_CONTEXT_WINDOW_SIZE - 1,
			})
		: [];
	const incomingMessages = [...priorMessages, input.message];

	return (await validateUIMessages({
		messages: incomingMessages,
	})) satisfies OreAgentUIMessage[];
}

async function persistIncomingUserMessage(input: StreamAssistantReplyInput) {
	await appendMessagesToChat({
		chatId: input.chatId,
		userId: input.userId,
		messages: [input.message],
		ipHash: input.ipHash,
	});
}

function createCloseOnce(close: () => Promise<void>) {
	let closePromise: Promise<void> | null = null;
	return async () => {
		if (!closePromise) closePromise = close();
		await closePromise;
	};
}

async function persistAssistantMessagesForCurrentTurn(input: {
	streamInput: StreamAssistantReplyInput;
	messages: UIMessage[];
	knownMessageIds: Set<string>;
}) {
	const newAssistantMessages = selectAssistantMessagesForCurrentTurn({
		allMessages: input.messages,
		requestMessageId: input.streamInput.message.id,
		knownMessageIds: input.knownMessageIds,
	});

	if (newAssistantMessages.length === 0) return;

	try {
		await appendMessagesToChat({
			chatId: input.streamInput.chatId,
			userId: input.streamInput.userId,
			messages: newAssistantMessages,
			ipHash: null,
		});
	} catch (error) {
		reportChatRouteError({
			request: input.streamInput.request,
			requestId: input.streamInput.requestId,
			route: input.streamInput.route,
			stage: "onFinish",
			chatId: input.streamInput.chatId,
			userId: input.streamInput.userId,
			error,
		});
	}
}

function createOnFinishHandler(input: {
	streamInput: StreamAssistantReplyInput;
	knownMessageIds: Set<string>;
	closeMcpTools: () => Promise<void>;
}) {
	return async ({ messages }: { messages: UIMessage[] }) => {
		try {
			await persistAssistantMessagesForCurrentTurn({
				streamInput: input.streamInput,
				messages,
				knownMessageIds: input.knownMessageIds,
			});
		} finally {
			await input.closeMcpTools();
		}
	};
}
