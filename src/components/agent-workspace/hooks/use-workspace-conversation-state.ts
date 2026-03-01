"use client";

import { useCallback, useState } from "react";
import type { OreAgentUIMessage } from "@/lib/agents/ore-agent";
import type { AgentSessionDetail } from "../workspace-types";
import { createSessionId, parseJsonResponse } from "../workspace-utils";

type UseWorkspaceConversationStateOptions = {
	closeSidebar: () => void;
	refreshSessions: () => Promise<void>;
	setPageError: (message: string | null) => void;
	onDraftCommitted: (sessionId: string, firstPrompt: string) => void;
};

export function useWorkspaceConversationState({
	closeSidebar,
	refreshSessions,
	setPageError,
	onDraftCommitted,
}: UseWorkspaceConversationStateOptions) {
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
		null,
	);
	const [messages, setMessages] = useState<AgentSessionDetail["messages"]>([]);
	const [draftSessionId, setDraftSessionId] = useState(() => createSessionId());
	const [isLoadingConversation, setIsLoadingConversation] = useState(false);

	const effectiveSessionId = selectedSessionId ?? draftSessionId;

	const loadSession = useCallback(
		async (sessionId: string) => {
			setIsLoadingConversation(true);
			setPageError(null);
			try {
				const response = await fetch(
					`/api/chats/${encodeURIComponent(sessionId)}`,
					{
						method: "GET",
						cache: "no-store",
					},
				);
				const payload = await parseJsonResponse<AgentSessionDetail>(response);
				setSelectedSessionId(payload.id);
				setMessages(payload.messages);
				closeSidebar();
			} catch (error) {
				setPageError(
					error instanceof Error
						? error.message
						: "Failed to load the selected session.",
				);
			} finally {
				setIsLoadingConversation(false);
			}
		},
		[closeSidebar, setPageError],
	);

	const startNewSession = useCallback(() => {
		setSelectedSessionId(null);
		setMessages([]);
		setDraftSessionId(createSessionId());
		setPageError(null);
		closeSidebar();
	}, [closeSidebar, setPageError]);

	const commitDraftSession = useCallback(
		(sessionId: string, firstPrompt: string) => {
			setSelectedSessionId(sessionId);
			onDraftCommitted(sessionId, firstPrompt);
		},
		[onDraftCommitted],
	);

	const syncConversation = useCallback(
		(nextMessages: OreAgentUIMessage[]) => {
			setMessages(nextMessages);
			void refreshSessions();
		},
		[refreshSessions],
	);

	return {
		selectedSessionId,
		effectiveSessionId,
		messages,
		isPersistedSession: Boolean(selectedSessionId),
		isLoading: isLoadingConversation,
		loadSession,
		startNewSession,
		commitDraftSession,
		syncConversation,
	};
}
