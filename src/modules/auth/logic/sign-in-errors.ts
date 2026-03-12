const DEFAULT_SIGN_IN_ERROR_MESSAGE =
	"Unable to start Google sign-in. Please try again.";

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

export function getBetterAuthClientErrorMessage(
	result: unknown,
): string | null {
	if (!result || typeof result !== "object") {
		return null;
	}

	const error = (result as { error?: unknown }).error;
	if (!error) {
		return null;
	}

	if (isNonEmptyString(error)) {
		return error;
	}

	if (typeof error !== "object") {
		return DEFAULT_SIGN_IN_ERROR_MESSAGE;
	}

	const message = (error as { message?: unknown }).message;
	if (isNonEmptyString(message)) {
		return message;
	}

	const statusText = (error as { statusText?: unknown }).statusText;
	if (isNonEmptyString(statusText)) {
		return statusText;
	}

	const status = (error as { status?: unknown }).status;
	if (typeof status === "number") {
		return `Sign-in failed (${status}).`;
	}

	return DEFAULT_SIGN_IN_ERROR_MESSAGE;
}

export function getSignInFailureMessage(error: unknown): string {
	if (isNonEmptyString(error)) {
		return error;
	}

	if (error instanceof Error && isNonEmptyString(error.message)) {
		return error.message;
	}

	return DEFAULT_SIGN_IN_ERROR_MESSAGE;
}
