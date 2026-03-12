"use client";

import { useCallback } from "react";
import type { AgentSessionSummary } from "../../../types/workspace";
import { deleteChat } from "../../../client/chat-api";

type UseDeleteSessionActionOptions = {
	selectedSessionId: string | null;
	startNewSession: () => void;
	removeSession: (sessionId: string) => void;
	setPageError: (message: string | null) => void;
};

export function useDeleteSessionAction({
	selectedSessionId,
	startNewSession,
	removeSession,
	setPageError,
}: UseDeleteSessionActionOptions) {
	return useCallback(
		async (session: AgentSessionSummary) => {
			if (!window.confirm("Delete this session?")) {
				return;
			}

			try {
				await deleteChat(session.id);

				removeSession(session.id);
				if (selectedSessionId === session.id) {
					startNewSession();
				}
			} catch (error) {
				setPageError(
					error instanceof Error ? error.message : "Failed to delete session.",
				);
			}
		},
		[removeSession, selectedSessionId, setPageError, startNewSession],
	);
}
