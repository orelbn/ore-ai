"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentSessionSummary } from "../workspace-types";
import {
	buildSessionTitleFromInput,
	parseJsonResponse,
} from "../workspace-utils";

type UseWorkspaceSessionCatalogOptions = {
	setPageError: (message: string | null) => void;
};

export function useWorkspaceSessionCatalog({
	setPageError,
}: UseWorkspaceSessionCatalogOptions) {
	const [sessions, setSessions] = useState<AgentSessionSummary[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const refreshSessions = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/chats", {
				method: "GET",
				cache: "no-store",
			});
			const payload = await parseJsonResponse<{
				chats: AgentSessionSummary[];
			}>(response);
			setSessions(payload.chats);
			setPageError(null);
		} catch (error) {
			setPageError(
				error instanceof Error ? error.message : "Failed to load sessions.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [setPageError]);

	const removeSession = useCallback((sessionId: string) => {
		setSessions((current) => current.filter((entry) => entry.id !== sessionId));
	}, []);

	const addDraftCommittedSession = useCallback(
		(sessionId: string, firstPrompt: string) => {
			setSessions((current) => {
				if (current.some((entry) => entry.id === sessionId)) {
					return current;
				}

				return [
					{
						id: sessionId,
						title: buildSessionTitleFromInput(firstPrompt),
						updatedAt: Date.now(),
						lastMessagePreview: firstPrompt.slice(0, 180),
					},
					...current,
				];
			});
		},
		[],
	);

	useEffect(() => {
		void refreshSessions();
	}, [refreshSessions]);

	return {
		sessions,
		isLoading,
		refreshSessions,
		removeSession,
		addDraftCommittedSession,
	};
}
