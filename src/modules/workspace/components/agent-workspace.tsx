"use client";

import { useEffect, useState } from "react";
import {
	createEmptyConversationSeed,
	type ConversationRecord,
} from "@/modules/chat";
import { ConversationPane } from "./conversation-pane";
import { WorkspaceHeader } from "./workspace-header";

type AgentWorkspaceProps = {
	hasActiveSession: boolean;
	initialConversation: ConversationRecord;
	turnstileSiteKey: string;
};

export function AgentWorkspace({
	hasActiveSession,
	initialConversation,
	turnstileSiteKey,
}: AgentWorkspaceProps) {
	const [conversationSeed, setConversationSeed] =
		useState<ConversationRecord>(initialConversation);

	useEffect(() => {
		setConversationSeed(initialConversation);
	}, [initialConversation]);

	return (
		<main className="relative h-dvh overflow-hidden bg-background text-foreground">
			<section className="flex h-full min-h-0 flex-col">
				<WorkspaceHeader
					onResetConversation={() => {
						setConversationSeed(createEmptyConversationSeed());
					}}
				/>

				<div className="min-h-0 flex-1">
					<ConversationPane
						hasActiveSession={hasActiveSession}
						initialConversation={conversationSeed}
						turnstileSiteKey={turnstileSiteKey}
					/>
				</div>
			</section>
		</main>
	);
}
