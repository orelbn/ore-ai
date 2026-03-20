"use client";

import { useState } from "react";
import { SESSION_ACCESS_TURNSTILE_ACTION } from "../constants";

const SESSION_UNAVAILABLE_MESSAGE =
	"We couldn't send your message right now. Please refresh and try again.";
const SESSION_RETRY_MESSAGE =
	"We couldn't get things ready right now. Please try again.";
const SESSION_REJECTED_MESSAGE =
	"We couldn't keep your chat session active. Please verify and try again.";

type SessionAccessState = {
	sessionBindingId: string | null;
	turnstileToken: string | null;
	turnstileWidgetKey: number;
	error: string | null;
};

export function useSessionAccess(turnstileSiteKey: string) {
	const [state, setState] = useState<SessionAccessState>({
		sessionBindingId: null,
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
			sessionBindingId: null,
			turnstileToken: null,
			turnstileWidgetKey: current.turnstileWidgetKey + 1,
			error: nextError,
		}));
	}

	function markSessionAccessActive(sessionBindingId: string | null) {
		setState((current) => ({
			...current,
			sessionBindingId,
			turnstileToken: null,
			error: sessionBindingId ? null : SESSION_UNAVAILABLE_MESSAGE,
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
		turnstileSiteKey && !state.sessionBindingId && !state.turnstileToken
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
			turnstileSiteKey && (state.sessionBindingId || state.turnstileToken),
		),
		challenge,
		error: state.error,
		sessionBindingId: state.sessionBindingId,
		turnstileToken: state.turnstileToken,
		clearError,
		markSessionAccessActive,
		handleSessionAccessRejected: () => {
			resetTurnstileWidget(SESSION_REJECTED_MESSAGE);
		},
	};
}
