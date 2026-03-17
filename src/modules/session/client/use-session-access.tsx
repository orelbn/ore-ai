"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSessionAccessPublicConfig } from "../public-config";
import { SESSION_ACCESS_TURNSTILE_ACTION } from "../constants";
import {
	activateSessionAccess,
	applySessionAccessPublicConfig,
	applySessionAccessRefreshFailure,
	canSubmitWithSessionAccess,
	clearSessionAccessError,
	hasFreshSessionAccess as stateHasFreshSessionAccess,
	resetSessionAccessTurnstile,
	SESSION_PREPARING_MESSAGE,
	SESSION_RETRY_MESSAGE,
	SESSION_UNAVAILABLE_MESSAGE,
	type SessionAccessState,
	storeTurnstileToken,
} from "./session-access-state";

export function useSessionAccess() {
	const [state, setState] = useState<SessionAccessState>({
		hasLoadedPublicConfig: false,
		turnstileSiteKey: "",
		hasSessionAccess: false,
		sessionBindingId: null,
		sessionAccessExpiresAt: null,
		turnstileToken: null,
		turnstileWidgetKey: 0,
		error: null,
	});
	const stateRef = useRef(state);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const updateState = useCallback(
		(updater: (current: SessionAccessState) => SessionAccessState) => {
			setState((current) => {
				const nextState = updater(current);
				stateRef.current = nextState;
				return nextState;
			});
		},
		[],
	);

	const refreshPublicConfig = useCallback(async () => {
		try {
			const config = await getSessionAccessPublicConfig();
			updateState((current) => applySessionAccessPublicConfig(current, config));
			return config;
		} catch {
			updateState(applySessionAccessRefreshFailure);
			return null;
		}
	}, [updateState]);

	useEffect(() => {
		void refreshPublicConfig();
	}, [refreshPublicConfig]);

	const hasFreshSessionAccess = useMemo(() => {
		return stateHasFreshSessionAccess(state);
	}, [state]);

	const canSubmit = useMemo(() => {
		return canSubmitWithSessionAccess(state);
	}, [state]);

	function clearError() {
		updateState(clearSessionAccessError);
	}

	function resetTurnstileWidget(nextError: string | null = null) {
		updateState((current) => resetSessionAccessTurnstile(current, nextError));
	}

	function markSessionAccessActive(sessionBindingId: string | null) {
		updateState((current) => activateSessionAccess(current, sessionBindingId));
	}

	function handleTurnstileToken(token: string) {
		updateState((current) => storeTurnstileToken(current, token));
	}

	function handleTurnstileError() {
		resetTurnstileWidget(SESSION_RETRY_MESSAGE);
	}

	function handleTurnstileExpired() {
		resetTurnstileWidget(null);
	}

	async function ensureSessionAccess(): Promise<string | null> {
		const currentState = stateRef.current;
		const currentHasFreshSessionAccess =
			stateHasFreshSessionAccess(currentState);

		if (currentHasFreshSessionAccess && currentState.sessionBindingId) {
			return currentState.sessionBindingId;
		}

		if (currentHasFreshSessionAccess) {
			const refreshedConfig = await refreshPublicConfig();
			return refreshedConfig?.sessionBindingId ?? null;
		}

		if (!currentState.hasLoadedPublicConfig || !currentState.turnstileSiteKey) {
			updateState((current) => ({
				...current,
				error: SESSION_UNAVAILABLE_MESSAGE,
			}));
			return null;
		}

		if (!currentState.turnstileToken) {
			updateState((current) => ({
				...current,
				error: SESSION_PREPARING_MESSAGE,
			}));
			return null;
		}

		const response = await fetch("/api/session/verify", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ token: currentState.turnstileToken }),
			credentials: "same-origin",
		});

		if (!response.ok) {
			resetTurnstileWidget(SESSION_RETRY_MESSAGE);
			return null;
		}

		const refreshedConfig = await refreshPublicConfig();
		const nextSessionBindingId = refreshedConfig?.sessionBindingId ?? null;
		markSessionAccessActive(nextSessionBindingId);
		return nextSessionBindingId;
	}

	return {
		canSubmit,
		error: state.error,
		hasLoadedPublicConfig: state.hasLoadedPublicConfig,
		sessionBindingId: state.sessionBindingId,
		turnstileSiteKey: state.turnstileSiteKey,
		turnstileWidgetKey: state.turnstileWidgetKey,
		turnstileAction: SESSION_ACCESS_TURNSTILE_ACTION,
		hasFreshSessionAccess,
		clearError,
		ensureSessionAccess,
		handleSessionAccessRejected: () => {
			resetTurnstileWidget(null);
		},
		handleTurnstileExpired,
		handleTurnstileError,
		handleTurnstileToken,
	};
}
