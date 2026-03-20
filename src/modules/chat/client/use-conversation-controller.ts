"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/services/auth/client";
import type { ConversationRecord } from "@/modules/chat/types";
import { useSessionAccess } from "@/modules/session/client";
import { SESSION_RESET_RESPONSE_HEADER } from "@/modules/session";

export function useConversationController(
	turnstileSiteKey: string,
	hasActiveSession: boolean,
	initialConversation: ConversationRecord,
) {
	const [input, setInput] = useState("");
	const bottomAnchorRef = useRef<HTMLDivElement>(null);
	const conversationIdRef = useRef(initialConversation.conversationId);
	const initialMessages = useRef(initialConversation.messages);
	const sessionAccess = useSessionAccess(turnstileSiteKey, hasActiveSession);

	function resetConversationAndReload() {
		globalThis.location.reload();
	}

	const chatTransportFetch = Object.assign(
		async (
			input: Parameters<typeof globalThis.fetch>[0],
			init?: Parameters<typeof globalThis.fetch>[1],
		) => {
			const headers = new Headers(init?.headers);
			if (sessionAccess.hasActiveSession && !sessionAccess.turnstileToken) {
				headers.set("x-ore-active-session", "true");
			}

			const response = await globalThis.fetch(input, {
				...init,
				headers,
			});
			if (response.headers.get(SESSION_RESET_RESPONSE_HEADER) === "true") {
				resetConversationAndReload();
				return new Response(
					"We couldn't keep your chat session active. Refreshing now...",
					{
						status: 401,
					},
				);
			}

			if (response.ok) {
				sessionAccess.markSessionAccessActive();
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

	const { messages, sendMessage, status, error, stop } = useChat<
		ConversationRecord["messages"][number]
	>({
		id: "ore-ai",
		messages: initialMessages.current,
		onError: (chatError) => {
			if (/session access/i.test(chatError.message)) {
				sessionAccess.handleSessionAccessRejected();
			}
		},
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

	const messageCount = messages.length;
	useEffect(() => {
		void messageCount;
		bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messageCount]);

	async function sendPrompt(promptText: string) {
		setInput("");
		sessionAccess.clearError();

		if (!sessionAccess.hasActiveSession) {
			try {
				await authClient.signIn.anonymous({
					fetchOptions: {
						headers: {
							"x-captcha-response": sessionAccess.turnstileToken ?? "",
						},
					},
				});
				sessionAccess.markSessionAccessActive();
			} catch {
				sessionAccess.handleSessionAccessRejected();
				return;
			}
		}

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
