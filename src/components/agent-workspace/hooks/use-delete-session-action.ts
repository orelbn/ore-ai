"use client";

import { useCallback } from "react";
import type { AgentSessionSummary } from "../workspace-types";

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
				const response = await fetch(
					`/api/chats/${encodeURIComponent(session.id)}`,
					{
						method: "DELETE",
					},
				);
				if (!response.ok) {
					throw new Error("Failed to delete session.");
				}

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
