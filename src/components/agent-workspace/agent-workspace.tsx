"use client";

import Image from "next/image";
import { ConversationPane } from "./conversation-pane";
import { SessionSidebar } from "./session-sidebar";
import { useAgentWorkspaceState } from "./use-agent-workspace-state";
import { NewSessionIcon } from "./workspace-icons";

export function AgentWorkspace() {
	const {
		sessions,
		selectedSessionId,
		conversationMessages,
		effectiveSessionId,
		isLoadingSessions,
		isLoadingConversation,
		pageError,
		isSidebarOpen,
		setIsSidebarOpen,
		loadSession,
		startNewSession,
		deleteSession,
		commitDraftSession,
		syncConversation,
	} = useAgentWorkspaceState();

	return (
		<main className="relative h-dvh overflow-hidden bg-background text-foreground">
			<SessionSidebar
				sessions={sessions}
				selectedSessionId={selectedSessionId}
				isLoading={isLoadingSessions}
				isOpen={isSidebarOpen}
				onClose={() => setIsSidebarOpen(false)}
				onCreateSession={startNewSession}
				onSelectSession={(sessionId) => void loadSession(sessionId)}
				onDeleteSession={(session) => void deleteSession(session)}
			/>

			<section className="flex h-full min-h-0 flex-col">
				<header className="flex items-center justify-between px-4 py-3 sm:px-6">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setIsSidebarOpen((open) => !open)}
							title="Toggle sessions"
							className="rounded-md p-2 text-2xl leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							aria-label="Toggle session menu"
						>
							☰
						</button>
						<button
							type="button"
							onClick={startNewSession}
							title="New session"
							aria-label="New session"
							className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<NewSessionIcon className="size-6" />
						</button>
					</div>
					<div className="flex items-center gap-3 text-foreground">
						<Image
							src="/ore-ai.webp"
							alt=""
							width={28}
							height={28}
							className="rounded-full"
							priority
						/>
						<span className="text-base font-semibold tracking-tight">
							Ore AI
						</span>
					</div>
				</header>

				{pageError ? (
					<div className="mx-auto mb-2 w-full max-w-3xl px-4 sm:px-6">
						<div
							className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
							role="alert"
						>
							{pageError}
						</div>
					</div>
				) : null}

				<div className="min-h-0 flex-1">
					{isLoadingConversation ? (
						<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
							Loading session...
						</div>
					) : (
						<ConversationPane
							key={effectiveSessionId}
							sessionId={effectiveSessionId}
							isPersistedSession={Boolean(selectedSessionId)}
							initialMessages={conversationMessages}
							onDraftCommitted={commitDraftSession}
							onConversationSynced={syncConversation}
						/>
					)}
				</div>
			</section>
		</main>
	);
}
