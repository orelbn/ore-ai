"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const SESSION_QUERY_PARAM = "session";
const LEGACY_CHAT_QUERY_PARAM = "chat";

export function useSessionRouting() {
	const router = useRouter();
	const searchParams = useSearchParams();

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
			router.replace(query ? `/?${query}` : "/", { scroll: false });
		},
		[router, searchParams],
	);

	return {
		sessionIdFromUrl,
		updateSessionInUrl,
	};
}
