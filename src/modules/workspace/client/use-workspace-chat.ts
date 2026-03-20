"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef } from "react";
import type { ConversationMessage, ConversationRecord } from "@/modules/chat";

type WorkspaceChatInput = {
	handleRejected: () => void;
	initialConversation: ConversationRecord;
	markVerified: () => void;
};

export function useWorkspaceChat({
	handleRejected,
	initialConversation,
	markVerified,
}: WorkspaceChatInput) {
	const conversationIdRef = useRef(initialConversation.conversationId);

	const chatTransportFetch = Object.assign(
		async (
			input: Parameters<typeof globalThis.fetch>[0],
			init?: Parameters<typeof globalThis.fetch>[1],
		) => {
			const response = await globalThis.fetch(input, {
				...init,
				headers: init?.headers,
			});

			if (response.ok) {
				markVerified();
			}

			if (response.status === 401) {
				handleRejected();
				return new Response(
					"We couldn't send your message. Please try again.",
					{
						status: 401,
					},
				);
			}

			return response;
		},
		globalThis.fetch,
	);

	const { setMessages, ...chat } = useChat<ConversationMessage>({
		id: "ore-ai",
		messages: initialConversation.messages,
		transport: new DefaultChatTransport({
			api: "/api/chat",
			fetch: chatTransportFetch,
			prepareSendMessagesRequest({ messages: requestMessages }) {
				const latestMessage = requestMessages[requestMessages.length - 1];

				return {
					body: {
						conversationId: conversationIdRef.current,
						message: latestMessage,
					},
				};
			},
		}),
	});

	useEffect(() => {
		conversationIdRef.current = initialConversation.conversationId;
		setMessages(initialConversation.messages);
	}, [initialConversation, setMessages]);

	return chat;
}
