"use client";

import { useState } from "react";
import { SESSION_ACCESS_TURNSTILE_ACTION } from "../constants";

const SESSION_RETRY_MESSAGE =
	"We couldn't get things ready right now. Please try again.";
const SESSION_REJECTED_MESSAGE =
	"We couldn't keep your chat session active. Please verify and try again.";

type SessionAccessState = {
	hasActiveSession: boolean;
	turnstileToken: string | null;
	turnstileWidgetKey: number;
	error: string | null;
};

export function useSessionAccess(
	turnstileSiteKey: string,
	initialHasActiveSession: boolean,
) {
	const [state, setState] = useState<SessionAccessState>({
		hasActiveSession: initialHasActiveSession,
		turnstileToken: null,
		turnstileWidgetKey: 0,
		error: null,
	});

	function clearError() {
		setState((current) =>
			current.error === null ? current : { ...current, error: null },
		);
	}

	function resetTurnstileWidget(nextError: string | null = null) {
		setState((current) => ({
			...current,
			hasActiveSession: false,
			turnstileToken: null,
			turnstileWidgetKey: current.turnstileWidgetKey + 1,
			error: nextError,
		}));
	}

	function markSessionAccessActive() {
		setState((current) => ({
			...current,
			hasActiveSession: true,
			turnstileToken: null,
			error: null,
		}));
	}

	function handleTurnstileToken(token: string) {
		setState((current) => ({
			...current,
			turnstileToken: token,
			error: null,
		}));
	}

	function handleTurnstileError() {
		resetTurnstileWidget(SESSION_RETRY_MESSAGE);
	}

	function handleTurnstileExpired() {
		resetTurnstileWidget(null);
	}

	const challenge =
		turnstileSiteKey && !state.hasActiveSession && !state.turnstileToken
			? {
					action: SESSION_ACCESS_TURNSTILE_ACTION,
					siteKey: turnstileSiteKey,
					widgetKey: state.turnstileWidgetKey,
					onToken: handleTurnstileToken,
					onError: handleTurnstileError,
					onExpired: handleTurnstileExpired,
				}
			: null;

	return {
		canSubmit: Boolean(
			turnstileSiteKey && (state.hasActiveSession || state.turnstileToken),
		),
		challenge,
		error: state.error,
		hasActiveSession: state.hasActiveSession,
		turnstileToken: state.turnstileToken,
		clearError,
		markSessionAccessActive,
		handleSessionAccessRejected: () => {
			resetTurnstileWidget(SESSION_REJECTED_MESSAGE);
		},
	};
}
