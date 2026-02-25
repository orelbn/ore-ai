"use client";

import { useRouter, useRouterState } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

const SESSION_QUERY_PARAM = "session";
const LEGACY_CHAT_QUERY_PARAM = "chat";

export function useSessionRouting() {
	const router = useRouter();
	const searchStr = useRouterState({
		select: (state) => state.location.searchStr,
	});
	const searchParams = useMemo(
		() => new URLSearchParams(searchStr),
		[searchStr],
	);

	const sessionIdFromUrl = useMemo(
		() =>
			searchParams.get(SESSION_QUERY_PARAM) ??
			searchParams.get(LEGACY_CHAT_QUERY_PARAM),
		[searchParams],
	);

	const updateSessionInUrl = useCallback(
		(sessionId: string | null) => {
			const nextParams = new URLSearchParams(searchParams.toString());
			if (sessionId) {
				nextParams.set(SESSION_QUERY_PARAM, sessionId);
			} else {
				nextParams.delete(SESSION_QUERY_PARAM);
			}
			nextParams.delete(LEGACY_CHAT_QUERY_PARAM);

			const query = nextParams.toString();
			router.history.replace(query ? `/?${query}` : "/");
		},
		[router, searchParams],
	);

	return {
		sessionIdFromUrl,
		updateSessionInUrl,
	};
}
