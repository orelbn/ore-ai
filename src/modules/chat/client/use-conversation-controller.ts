"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";
import { useSessionAccess } from "@/modules/session/client";
import { normalizeConversationHistoryMessages } from "../messages/history";
import {
	createConversationSnapshot,
	persistConversation,
	readStoredConversation,
	type StoredConversationSnapshot,
} from "./conversation-storage";
import { selectMessagesByTurnSize } from "./context-window";
import { buildRetriedChatRequest } from "./retry-request";
import { CHAT_CONTEXT_MAX_BYTES } from "../workspace/constants";

function buildRetryFailureResponse(): Response {
	return new Response("We couldn't send your message. Please try again.", {
		status: 401,
	});
}

export function useConversationController() {
	const [input, setInput] = useState("");
	const bottomAnchorRef = useRef<HTMLDivElement>(null);
	const initialConversation = useRef(readStoredConversation());
	const conversationIdRef = useRef(initialConversation.current.conversationId);
	const sessionBindingIdRef = useRef(
		initialConversation.current.sessionBindingId,
	);
	const initialMessages = useRef(initialConversation.current.messages);
	const sessionAccess = useSessionAccess();
	const applyConversationSnapshotRef = useRef(
		(snapshot: StoredConversationSnapshot) => {
			conversationIdRef.current = snapshot.conversationId;
			sessionBindingIdRef.current = snapshot.sessionBindingId;
		},
	);

	const chatTransportFetch = Object.assign(
		async (
			input: Parameters<typeof globalThis.fetch>[0],
			init?: Parameters<typeof globalThis.fetch>[1],
		) => {
			const response = await globalThis.fetch(input, init);
			if (response.status !== 401) {
				return response;
			}

			sessionAccess.handleSessionAccessRejected();
			const restored = await sessionAccess.ensureSessionAccess();
			if (!restored) {
				return buildRetryFailureResponse();
			}

			let retriedInit = init;
			if (sessionBindingIdRef.current !== restored) {
				const nextConversation = createConversationSnapshot(restored);
				const retriedRequest = buildRetriedChatRequest({
					body: init?.body,
					conversationId: nextConversation.conversationId,
				});
				if (!retriedRequest) {
					return buildRetryFailureResponse();
				}

				applyConversationSnapshotRef.current({
					...nextConversation,
					messages: [retriedRequest.latestUserMessage],
				});
				retriedInit = {
					...init,
					body: retriedRequest.body,
				};
			}

			const retriedResponse = await globalThis.fetch(input, retriedInit);
			return retriedResponse.status === 401
				? buildRetryFailureResponse()
				: retriedResponse;
		},
		globalThis.fetch,
	);

	const { messages, sendMessage, setMessages, status, error, stop } =
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
						},
					};
				},
			}),
		});

	applyConversationSnapshotRef.current = (snapshot) => {
		conversationIdRef.current = snapshot.conversationId;
		sessionBindingIdRef.current = snapshot.sessionBindingId;
		setMessages(snapshot.messages);
		persistConversation(snapshot);
	};

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

	useEffect(() => {
		if (!sessionAccess.hasLoadedPublicConfig) {
			return;
		}

		if (sessionBindingIdRef.current === sessionAccess.sessionBindingId) {
			return;
		}

		applyConversationSnapshotRef.current(
			createConversationSnapshot(sessionAccess.sessionBindingId),
		);
	}, [sessionAccess.hasLoadedPublicConfig, sessionAccess.sessionBindingId]);

	async function sendPrompt(promptText: string) {
		setInput("");
		sessionAccess.clearError();
		await sendMessage({ text: promptText });
	}

	async function handleSubmit() {
		const trimmedInput = input.trim();
		if (!trimmedInput || status === "submitted" || status === "streaming") {
			return;
		}

		const sessionBindingId = await sessionAccess.ensureSessionAccess();
		if (!sessionBindingId) {
			return;
		}

		if (sessionBindingIdRef.current !== sessionBindingId) {
			applyConversationSnapshotRef.current(
				createConversationSnapshot(sessionBindingId),
			);
		}

		await sendPrompt(trimmedInput);
	}

	return {
		bottomAnchorRef,
		error,
		handleSubmit,
		input,
		isEmpty: messages.length === 0,
		messages,
		sessionAccess,
		setInput,
		status,
		stop,
	};
}
