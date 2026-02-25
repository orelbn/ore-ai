"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import type { OreAgentUIMessage } from "@/lib/agents/ore-agent";
import { ConversationComposer } from "./conversation-composer";
import { ConversationEmptyState } from "./conversation-empty-state";
import { ConversationMessageList } from "./conversation-message-list";

type ConversationPaneProps = {
	sessionId: string;
	isPersistedSession: boolean;
	initialMessages: OreAgentUIMessage[];
	onDraftCommitted: (sessionId: string, firstPrompt: string) => void;
	onConversationSynced: (messages: OreAgentUIMessage[]) => void;
};

const QUICK_PROMPTS = [
	"What are the projects Orel is currently working on?",
	"What are Orel's favorite coffee shops?",
	"Which books is Orel currently reading?",
	"Provide Orel's latest blog post.",
];

export function ConversationPane({
	sessionId,
	isPersistedSession,
	initialMessages,
	onDraftCommitted,
	onConversationSynced,
}: ConversationPaneProps) {
	const [input, setInput] = useState("");
	const bottomAnchorRef = useRef<HTMLDivElement>(null);

	const { messages, sendMessage, status, error, stop } =
		useChat<OreAgentUIMessage>({
			id: sessionId,
			messages: initialMessages,
			onFinish: ({ messages: updatedMessages }) => {
				onConversationSynced(updatedMessages);
			},
			transport: new DefaultChatTransport({
				api: "/api/chat",
				prepareSendMessagesRequest({ id, messages: requestMessages }) {
					const latestMessage = requestMessages[requestMessages.length - 1];
					return {
						body: {
							id,
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

	async function handleSubmit() {
		const trimmedInput = input.trim();
		if (!trimmedInput || status === "submitted" || status === "streaming") {
			return;
		}

		if (!isPersistedSession) {
			onDraftCommitted(sessionId, trimmedInput);
		}

		setInput("");
		await sendMessage({ text: trimmedInput });
	}

	const isEmpty = messages.length === 0;

	const composer = (
		<ConversationComposer
			input={input}
			onInputChange={setInput}
			onSubmit={handleSubmit}
			status={status}
			onStop={stop}
			showQuickPrompts={isEmpty}
			quickPrompts={QUICK_PROMPTS}
			placeholder="What would you like to do?"
		/>
	);

	return (
		<section className="flex h-full min-h-0 flex-col">
			{isEmpty ? (
				<div className="flex flex-1 items-center justify-center px-4 sm:px-6">
					<div className="w-full max-w-3xl">
						<ConversationEmptyState />
						{composer}
					</div>
				</div>
			) : (
				<>
					<ConversationMessageList
						messages={messages}
						status={status}
						bottomAnchorRef={bottomAnchorRef}
					/>
					<div className="bg-background px-4 pb-4 pt-3 sm:px-6">
						<div className="mx-auto w-full max-w-3xl">{composer}</div>
					</div>
				</>
			)}
			{error ? (
				<p className="mt-2 px-2 text-xs text-destructive" role="alert">
					{error.message || "Something went wrong. Please try again."}
				</p>
			) : null}
		</section>
	);
}
