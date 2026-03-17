import { SESSION_ACCESS_COOKIE_MAX_AGE_SECONDS } from "../constants";

export const SESSION_UNAVAILABLE_MESSAGE =
	"We couldn't send your message right now. Please refresh and try again.";
export const SESSION_PREPARING_MESSAGE =
	"We're getting things ready. Please try again in a moment.";
export const SESSION_RETRY_MESSAGE =
	"We couldn't get things ready right now. Please try again.";

export type SessionAccessState = {
	hasLoadedPublicConfig: boolean;
	turnstileSiteKey: string;
	hasSessionAccess: boolean;
	sessionBindingId: string | null;
	sessionAccessExpiresAt: number | null;
	turnstileToken: string | null;
	turnstileWidgetKey: number;
	error: string | null;
};

export type SessionAccessPublicConfig = {
	turnstileSiteKey: string;
	hasSessionAccess: boolean;
	sessionBindingId: string | null;
};

export function hasFreshSessionAccess(
	state: Pick<
		SessionAccessState,
		"hasSessionAccess" | "sessionAccessExpiresAt"
	>,
	now: number = Date.now(),
): boolean {
	if (!state.hasSessionAccess) {
		return false;
	}

	if (state.sessionAccessExpiresAt === null) {
		return true;
	}

	return state.sessionAccessExpiresAt > now;
}

export function canSubmitWithSessionAccess(
	state: Pick<
		SessionAccessState,
		| "hasLoadedPublicConfig"
		| "hasSessionAccess"
		| "sessionAccessExpiresAt"
		| "turnstileToken"
	>,
): boolean {
	return (
		state.hasLoadedPublicConfig &&
		(hasFreshSessionAccess(state) || Boolean(state.turnstileToken))
	);
}

export function applySessionAccessPublicConfig(
	current: SessionAccessState,
	config: SessionAccessPublicConfig,
	now: number = Date.now(),
): SessionAccessState {
	const hasSessionAccess = Boolean(
		config.hasSessionAccess && config.sessionBindingId,
	);

	return {
		...current,
		hasLoadedPublicConfig: true,
		turnstileSiteKey: config.turnstileSiteKey,
		hasSessionAccess,
		sessionBindingId: config.sessionBindingId ?? null,
		sessionAccessExpiresAt: hasSessionAccess
			? now + SESSION_ACCESS_COOKIE_MAX_AGE_SECONDS * 1000
			: null,
	};
}

export function applySessionAccessRefreshFailure(
	current: SessionAccessState,
): SessionAccessState {
	return {
		...current,
		hasLoadedPublicConfig: true,
		error: SESSION_UNAVAILABLE_MESSAGE,
	};
}

export function clearSessionAccessError(
	current: SessionAccessState,
): SessionAccessState {
	return {
		...current,
		error: null,
	};
}

export function resetSessionAccessTurnstile(
	current: SessionAccessState,
	nextError: string | null = null,
): SessionAccessState {
	return {
		...current,
		hasSessionAccess: false,
		sessionBindingId: null,
		sessionAccessExpiresAt: null,
		turnstileToken: null,
		turnstileWidgetKey: current.turnstileWidgetKey + 1,
		error: nextError,
	};
}

export function activateSessionAccess(
	current: SessionAccessState,
	sessionBindingId: string | null,
	now: number = Date.now(),
): SessionAccessState {
	return {
		...current,
		hasSessionAccess: Boolean(sessionBindingId),
		sessionBindingId,
		sessionAccessExpiresAt: sessionBindingId
			? now + SESSION_ACCESS_COOKIE_MAX_AGE_SECONDS * 1000
			: null,
		turnstileToken: null,
		error: sessionBindingId ? null : SESSION_UNAVAILABLE_MESSAGE,
	};
}

export function storeTurnstileToken(
	current: SessionAccessState,
	token: string,
): SessionAccessState {
	return {
		...current,
		turnstileToken: token,
		error: null,
	};
}
