"use client";

import { useState } from "react";
import { clearStoredConversation } from "../../client/conversation-storage";
import { ConversationPane } from "./conversation-pane";
import { WorkspaceHeader } from "./workspace-header";

type AgentWorkspaceProps = {
	hasActiveSession: boolean;
	turnstileSiteKey: string;
};

export function AgentWorkspace({
	hasActiveSession,
	turnstileSiteKey,
}: AgentWorkspaceProps) {
	const [resetVersion, setResetVersion] = useState(0);

	return (
		<main className="relative h-dvh overflow-hidden bg-background text-foreground">
			<section className="flex h-full min-h-0 flex-col">
				<WorkspaceHeader
					onResetConversation={() => {
						clearStoredConversation();
						setResetVersion((current) => current + 1);
					}}
				/>

				<div className="min-h-0 flex-1">
					<ConversationPane
						key={resetVersion}
						hasActiveSession={hasActiveSession}
						turnstileSiteKey={turnstileSiteKey}
					/>
				</div>
			</section>
		</main>
	);
}
