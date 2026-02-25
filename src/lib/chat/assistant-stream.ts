import { createAgentUIStreamResponse, validateUIMessages } from "ai";
import type { UIMessage } from "ai";
import { createOreAgent } from "@/lib/agents/ore-agent";
import type { OreAgentUIMessage } from "@/lib/agents/ore-agent";
import { CHAT_CONTEXT_WINDOW_SIZE } from "./constants";
import { reportChatRouteError } from "./error-reporting";
import {
	appendMessagesToChat,
	buildChatTitleFromMessage,
	createChatSession,
	loadRecentChatMessagesForUser,
} from "./repository";

function getLastIndexById(messages: UIMessage[], id: string): number {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.id === id) {
			return index;
		}
	}
	return -1;
}

function getLastUserIndex(messages: UIMessage[]): number {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.role === "user") {
			return index;
		}
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
		if (candidate.role !== "assistant") {
			continue;
		}
		if (input.knownMessageIds.has(candidate.id) || seenIds.has(candidate.id)) {
			continue;
		}
		seenIds.add(candidate.id);
		selected.push(candidate);
	}

	return selected;
}

export async function streamAssistantReply(input: {
	request: Request;
	requestId: string;
	route: string;
	aiBinding: Ai;
	chatId: string;
	userId: string;
	message: UIMessage;
	ipHash: string | null;
	hasExistingSession: boolean;
}): Promise<Response> {
	if (!input.hasExistingSession) {
		await createChatSession({
			id: input.chatId,
			userId: input.userId,
			title: buildChatTitleFromMessage(input.message),
		});
	}

	const priorMessages = input.hasExistingSession
		? await loadRecentChatMessagesForUser({
				chatId: input.chatId,
				userId: input.userId,
				limit: CHAT_CONTEXT_WINDOW_SIZE - 1,
			})
		: [];

	const incomingMessages = [...priorMessages, input.message];
	const validatedMessages = (await validateUIMessages({
		messages: incomingMessages,
	})) as OreAgentUIMessage[];

	await appendMessagesToChat({
		chatId: input.chatId,
		userId: input.userId,
		messages: [input.message],
		ipHash: input.ipHash,
	});

	const knownMessageIds = new Set(validatedMessages.map((entry) => entry.id));
	const agent = createOreAgent(input.aiBinding);

	return createAgentUIStreamResponse({
		agent,
		uiMessages: validatedMessages,
		originalMessages: validatedMessages,
		onFinish: async ({ messages }) => {
			const newAssistantMessages = selectAssistantMessagesForCurrentTurn({
				allMessages: messages,
				requestMessageId: input.message.id,
				knownMessageIds,
			});

			if (newAssistantMessages.length === 0) {
				return;
			}

			try {
				await appendMessagesToChat({
					chatId: input.chatId,
					userId: input.userId,
					messages: newAssistantMessages,
					ipHash: null,
				});
			} catch (error) {
				reportChatRouteError({
					request: input.request,
					requestId: input.requestId,
					route: input.route,
					stage: "onFinish",
					chatId: input.chatId,
					userId: input.userId,
					error,
				});
			}
		},
		onError: () => "Something went wrong while generating the response.",
	});
}
