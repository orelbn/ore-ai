"use client";

import { SessionAccessChallenge } from "@/modules/session/client";
import { ConversationComposer } from "./conversation-composer";
import { ConversationEmptyState } from "./conversation-empty-state";
import { ConversationMessageList } from "./conversation-message-list";
import { EmptyStateFooter } from "./empty-state-footer";
import { useConversationController } from "../../client/use-conversation-controller";

const QUICK_PROMPTS = [
	"What are the projects Orel is currently working on?",
	"What are Orel's favorite coffee shops?",
	"Which books is Orel currently reading?",
	"Provide Orel's latest blog post.",
];
type ConversationPaneProps = {
	turnstileSiteKey: string;
};

export function ConversationPane({ turnstileSiteKey }: ConversationPaneProps) {
	const {
		bottomAnchorRef,
		canSubmit,
		error,
		handleSubmit,
		input,
		isEmpty,
		messages,
		sessionAccessChallenge,
		sessionAccessError,
		setInput,
		status,
		stop,
	} = useConversationController(turnstileSiteKey);

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

	const sessionAccessChallengeUi = sessionAccessChallenge ? (
		<SessionAccessChallenge {...sessionAccessChallenge} />
	) : null;

	return (
		<section className="flex h-full min-h-0 flex-col">
			{isEmpty ? (
				<div className="flex flex-1 min-h-0 flex-col px-4 pt-6 sm:px-6">
					<div className="flex flex-1 items-center justify-center">
						<div className="w-full max-w-3xl">
							<ConversationEmptyState />
							{composer}
							{sessionAccessChallengeUi}
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
							{sessionAccessChallengeUi}
						</div>
					</div>
				</>
			)}
			{sessionAccessError ? (
				<p className="mt-2 px-2 text-xs text-destructive" role="alert">
					{sessionAccessError}
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
