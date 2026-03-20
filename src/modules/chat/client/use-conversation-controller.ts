"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";
import { useSessionAccess } from "@/modules/session/client";
import { normalizeConversationHistoryMessages } from "../messages/history";
import {
	persistConversation,
	readStoredConversation,
} from "./conversation-storage";
import { selectMessagesByTurnSize } from "./context-window";
import { CHAT_CONTEXT_MAX_BYTES } from "../workspace/constants";

export function useConversationController(turnstileSiteKey: string) {
	const [input, setInput] = useState("");
	const bottomAnchorRef = useRef<HTMLDivElement>(null);
	const initialConversation = useRef(readStoredConversation());
	const conversationIdRef = useRef(initialConversation.current.conversationId);
	const sessionBindingIdRef = useRef(
		initialConversation.current.sessionBindingId,
	);
	const initialMessages = useRef(initialConversation.current.messages);
	const sessionAccess = useSessionAccess(turnstileSiteKey);

	const chatTransportFetch = Object.assign(
		async (
			input: Parameters<typeof globalThis.fetch>[0],
			init?: Parameters<typeof globalThis.fetch>[1],
		) => {
			const response = await globalThis.fetch(input, init);
			const nextSessionBindingId = response.headers.get(
				"x-ore-session-binding-id",
			);
			if (nextSessionBindingId) {
				sessionBindingIdRef.current = nextSessionBindingId;
				sessionAccess.markSessionAccessActive(nextSessionBindingId);
			}

			if (response.status === 401) {
				sessionAccess.handleSessionAccessRejected();
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

	const { messages, sendMessage, status, error, stop } =
		useChat<OreAgentUIMessage>({
			id: "ore-ai",
			messages: initialMessages.current,
			onFinish: ({ messages: updatedMessages }) => {
				persistConversation({
					conversationId: conversationIdRef.current,
					sessionBindingId: sessionBindingIdRef.current,
					messages: updatedMessages,
				});
			},
			onError: (chatError) => {
				if (/session access/i.test(chatError.message)) {
					sessionAccess.handleSessionAccessRejected();
				}
			},
			transport: new DefaultChatTransport({
				api: "/api/chat",
				fetch: chatTransportFetch,
				prepareSendMessagesRequest({ messages: requestMessages }) {
					const selectedMessages = selectMessagesByTurnSize({
						messages: normalizeConversationHistoryMessages(requestMessages),
						maxBytes: CHAT_CONTEXT_MAX_BYTES,
					});

					return {
						body: {
							conversationId: conversationIdRef.current,
							messages: selectedMessages,
							turnstileToken: sessionAccess.turnstileToken,
						},
					};
				},
			}),
		});

	const messageCount = messages.length;
	useEffect(() => {
		void messageCount;
		bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messageCount]);

	useEffect(() => {
		persistConversation({
			conversationId: conversationIdRef.current,
			sessionBindingId: sessionBindingIdRef.current,
			messages,
		});
	}, [messages]);

	async function sendPrompt(promptText: string) {
		setInput("");
		sessionAccess.clearError();
		await sendMessage({ text: promptText });
	}

	async function handleSubmit() {
		const trimmedInput = input.trim();
		if (
			!trimmedInput ||
			status === "submitted" ||
			status === "streaming" ||
			!sessionAccess.canSubmit
		) {
			return;
		}

		await sendPrompt(trimmedInput);
	}

	return {
		bottomAnchorRef,
		canSubmit: sessionAccess.canSubmit,
		error,
		handleSubmit,
		input,
		isEmpty: messages.length === 0,
		messages,
		sessionAccessChallenge: sessionAccess.challenge,
		sessionAccessError: sessionAccess.error,
		setInput,
		status,
		stop,
	};
}
