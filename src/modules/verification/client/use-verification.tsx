"use client";

import { useState } from "react";

const TURNSTILE_ACTION = "session_access";
const RETRY_MESSAGE =
	"We couldn't get things ready right now. Please try again.";
const REJECTED_MESSAGE =
	"We couldn't keep your chat session active. Please verify and try again.";

type VerificationState = {
	error: string | null;
	hasSession: boolean;
	token: string | null;
	widgetKey: number;
};

export function useVerification(
	turnstileSiteKey: string,
	initialHasSession: boolean,
) {
	const [state, setState] = useState<VerificationState>({
		error: null,
		hasSession: initialHasSession,
		token: null,
		widgetKey: 0,
	});

	function clearError() {
		setState((current) =>
			current.error === null ? current : { ...current, error: null },
		);
	}

	function resetChallenge(nextError: string | null = null) {
		setState((current) => ({
			...current,
			error: nextError,
			hasSession: false,
			token: null,
			widgetKey: current.widgetKey + 1,
		}));
	}

	function markVerified() {
		setState((current) => ({
			...current,
			error: null,
			hasSession: true,
			token: null,
		}));
	}

	function handleToken(token: string) {
		setState((current) => ({
			...current,
			error: null,
			token,
		}));
	}

	function handleTurnstileError() {
		resetChallenge(RETRY_MESSAGE);
	}

	function handleTurnstileExpired() {
		resetChallenge(null);
	}

	const challenge =
		turnstileSiteKey && !state.hasSession && !state.token
			? {
					action: TURNSTILE_ACTION,
					siteKey: turnstileSiteKey,
					widgetKey: state.widgetKey,
					onError: handleTurnstileError,
					onExpired: handleTurnstileExpired,
					onToken: handleToken,
				}
			: null;

	return {
		canSubmit: Boolean(turnstileSiteKey && (state.hasSession || state.token)),
		challenge,
		clearError,
		error: state.error,
		handleRejected: () => {
			resetChallenge(REJECTED_MESSAGE);
		},
		hasSession: state.hasSession,
		markVerified,
		token: state.token,
	};
}
