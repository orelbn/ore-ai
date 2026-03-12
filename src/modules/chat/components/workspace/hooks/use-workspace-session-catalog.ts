"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentSessionSummary } from "../../../types/workspace";
import { listChats } from "../../../client/chat-api";
import {
	buildSessionPreviewFromInput,
	buildSessionTitleFromInput,
} from "../../../workspace/utils";

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
			const payload = await listChats();
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
						lastMessagePreview: buildSessionPreviewFromInput(firstPrompt),
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
