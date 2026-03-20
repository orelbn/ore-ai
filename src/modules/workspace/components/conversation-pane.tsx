"use client";

import type { ConversationRecord } from "@/modules/chat";
import { useVerification, VerificationChallenge } from "@/modules/verification";
import { useAutoScroll } from "../client/use-auto-scroll";
import { useConversationSubmission } from "../client/use-conversation-submission";
import { useWorkspaceChat } from "../client/use-workspace-chat";
import { ConversationComposer } from "./conversation-composer";
import { ConversationEmptyState } from "./conversation-empty-state";
import { ConversationMessageList } from "./conversation-message-list";
import { EmptyStateFooter } from "./empty-state-footer";

const QUICK_PROMPTS = [
	"What are the projects Orel is currently working on?",
	"What are Orel's favorite coffee shops?",
	"Which books is Orel currently reading?",
	"Provide Orel's latest blog post.",
];

type ConversationPaneProps = {
	hasActiveSession: boolean;
	initialConversation: ConversationRecord;
	turnstileSiteKey: string;
};

export function ConversationPane({
	hasActiveSession,
	initialConversation,
	turnstileSiteKey,
}: ConversationPaneProps) {
	const {
		canSubmit,
		challenge,
		clearError,
		error: verificationError,
		handleRejected,
		hasSession,
		markVerified,
		token,
	} = useVerification(turnstileSiteKey, hasActiveSession);
	const { error, messages, sendMessage, status, stop } = useWorkspaceChat({
		handleRejected,
		initialConversation,
		markVerified,
	});
	const { handleSubmit, input, setInput } = useConversationSubmission({
		canSubmit,
		clearError,
		handleRejected,
		hasSession,
		markVerified,
		sendMessage,
		status,
		token,
	});
	const bottomAnchorRef = useAutoScroll(messages.length);
	const isEmpty = messages.length === 0;

	const composer = (
		<ConversationComposer
			input={input}
			onInputChange={setInput}
			onSubmit={handleSubmit}
			status={status}
			onStop={stop}
			canSubmit={canSubmit}
			showQuickPrompts={isEmpty}
			quickPrompts={QUICK_PROMPTS}
			placeholder={
				canSubmit
					? "What would you like to do?"
					: "Complete verification to unlock chat"
			}
		/>
	);

	const challengeUi = challenge ? (
		<VerificationChallenge {...challenge} />
	) : null;

	return (
		<section className="flex h-full min-h-0 flex-col">
			{isEmpty ? (
				<div className="flex flex-1 min-h-0 flex-col px-4 pt-6 sm:px-6">
					<div className="flex flex-1 items-center justify-center">
						<div className="w-full max-w-3xl">
							<ConversationEmptyState />
							{composer}
							{challengeUi}
						</div>
					</div>
					<div className="pb-4 pt-6">
						<EmptyStateFooter />
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
						<div className="mx-auto w-full max-w-3xl">
							{composer}
							{challengeUi}
						</div>
					</div>
				</>
			)}
			{verificationError ? (
				<p className="mt-2 px-2 text-xs text-destructive" role="alert">
					{verificationError}
				</p>
			) : null}
			{error ? (
				<p className="mt-2 px-2 text-xs text-destructive" role="alert">
					{error.message || "Something went wrong. Please try again."}
				</p>
			) : null}
		</section>
	);
}
