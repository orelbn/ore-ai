"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OreAgentUIMessage } from "@/lib/agents/ore-agent";
import type {
	AgentSessionDetail,
	AgentSessionSummary,
} from "./workspace-types";
import {
	buildSessionTitleFromInput,
	createSessionId,
	parseJsonResponse,
} from "./workspace-utils";
import { useSessionRouting } from "./use-session-routing";

export function useAgentWorkspaceState() {
	const { sessionIdFromUrl, updateSessionInUrl } = useSessionRouting();

	const [sessions, setSessions] = useState<AgentSessionSummary[]>([]);
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
		null,
	);
	const [conversationMessages, setConversationMessages] = useState<
		AgentSessionDetail["messages"]
	>([]);
	const [draftSessionId, setDraftSessionId] = useState(() => createSessionId());
	const [isLoadingSessions, setIsLoadingSessions] = useState(true);
	const [isLoadingConversation, setIsLoadingConversation] = useState(false);
	const [isResolvingUrlSession, setIsResolvingUrlSession] = useState(() =>
		Boolean(sessionIdFromUrl),
	);
	const [pageError, setPageError] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const isSwitchingToDraftRef = useRef(false);

	const effectiveSessionId = selectedSessionId ?? draftSessionId;

	const refreshSessions = useCallback(async () => {
		setIsLoadingSessions(true);
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
			setIsLoadingSessions(false);
		}
	}, []);

	const loadSession = useCallback(
		async (sessionId: string, syncUrl = true) => {
			isSwitchingToDraftRef.current = false;
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
				setConversationMessages(payload.messages);
				setIsSidebarOpen(false);
				if (syncUrl) {
					updateSessionInUrl(payload.id);
				}
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
		[updateSessionInUrl],
	);

	const startNewSession = useCallback(() => {
		isSwitchingToDraftRef.current = true;
		setSelectedSessionId(null);
		setConversationMessages([]);
		setDraftSessionId(createSessionId());
		setPageError(null);
		setIsSidebarOpen(false);
		updateSessionInUrl(null);
	}, [updateSessionInUrl]);

	const deleteSession = useCallback(
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

				setSessions((current) =>
					current.filter((entry) => entry.id !== session.id),
				);
				if (selectedSessionId === session.id) {
					startNewSession();
				}
			} catch (error) {
				setPageError(
					error instanceof Error ? error.message : "Failed to delete session.",
				);
			}
		},
		[selectedSessionId, startNewSession],
	);

	const commitDraftSession = useCallback(
		(sessionId: string, firstPrompt: string) => {
			isSwitchingToDraftRef.current = false;
			setSelectedSessionId(sessionId);
			updateSessionInUrl(sessionId);
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
		[updateSessionInUrl],
	);

	const syncConversation = useCallback(
		(messages: OreAgentUIMessage[]) => {
			setConversationMessages(messages);
			void refreshSessions();
		},
		[refreshSessions],
	);

	useEffect(() => {
		void refreshSessions();
	}, [refreshSessions]);

	useEffect(() => {
		if (isSwitchingToDraftRef.current) {
			if (!sessionIdFromUrl) {
				isSwitchingToDraftRef.current = false;
				setIsResolvingUrlSession(false);
			}
			return;
		}

		if (!sessionIdFromUrl) {
			setIsResolvingUrlSession(false);
			return;
		}

		if (sessionIdFromUrl === selectedSessionId) {
			setIsResolvingUrlSession(false);
			return;
		}

		setIsResolvingUrlSession(true);
		let isCancelled = false;

		void (async () => {
			try {
				await loadSession(sessionIdFromUrl, false);
			} finally {
				if (!isCancelled) {
					setIsResolvingUrlSession(false);
				}
			}
		})();

		return () => {
			isCancelled = true;
		};
	}, [loadSession, selectedSessionId, sessionIdFromUrl]);

	return {
		sessions,
		selectedSessionId,
		conversationMessages,
		effectiveSessionId,
		isLoadingSessions,
		isLoadingConversation: isLoadingConversation || isResolvingUrlSession,
		pageError,
		isSidebarOpen,
		setIsSidebarOpen,
		loadSession,
		startNewSession,
		deleteSession,
		commitDraftSession,
		syncConversation,
	};
}
