"use client";

import { useState } from "react";
import { ConversationPane } from "./conversation-pane";
import { useDeleteSessionAction } from "./hooks/use-delete-session-action";
import { useWorkspaceConversationState } from "./hooks/use-workspace-conversation-state";
import { useWorkspaceSessionCatalog } from "./hooks/use-workspace-session-catalog";
import { useWorkspaceSidebarState } from "./hooks/use-workspace-sidebar-state";
import { SessionSidebar } from "./session-sidebar";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspacePageError } from "./workspace-page-error";

export function AgentWorkspace() {
	const [pageError, setPageError] = useState<string | null>(null);
	const sidebar = useWorkspaceSidebarState();
	const catalog = useWorkspaceSessionCatalog({ setPageError });
	const conversation = useWorkspaceConversationState({
		closeSidebar: sidebar.close,
		refreshSessions: catalog.refreshSessions,
		setPageError,
		onDraftCommitted: catalog.addDraftCommittedSession,
	});
	const deleteSession = useDeleteSessionAction({
		selectedSessionId: conversation.selectedSessionId,
		startNewSession: conversation.startNewSession,
		removeSession: catalog.removeSession,
		setPageError,
	});

	return (
		<main className="relative h-dvh overflow-hidden bg-background text-foreground">
			<SessionSidebar
				sessions={catalog.sessions}
				selectedSessionId={conversation.selectedSessionId}
				isLoading={catalog.isLoading}
				isOpen={sidebar.isOpen}
				onClose={sidebar.close}
				onCreateSession={conversation.startNewSession}
				onSelectSession={(sessionId) =>
					void conversation.loadSession(sessionId)
				}
				onDeleteSession={(session) => void deleteSession(session)}
			/>

			<section className="flex h-full min-h-0 flex-col">
				<WorkspaceHeader
					onToggleSidebar={sidebar.toggle}
					onCreateSession={conversation.startNewSession}
				/>

				<WorkspacePageError message={pageError} />

				<div className="min-h-0 flex-1">
					{conversation.isLoading ? (
						<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
							Loading session...
						</div>
					) : (
						<ConversationPane
							key={conversation.effectiveSessionId}
							sessionId={conversation.effectiveSessionId}
							isPersistedSession={conversation.isPersistedSession}
							initialMessages={conversation.messages}
							onDraftCommitted={conversation.commitDraftSession}
							onConversationSynced={conversation.syncConversation}
						/>
					)}
				</div>
			</section>
		</main>
	);
}
