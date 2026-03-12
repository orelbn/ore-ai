import { describe, expect, test } from "vitest";
import {
	getBetterAuthClientErrorMessage,
	getSignInFailureMessage,
} from "./sign-in-errors";

describe("getBetterAuthClientErrorMessage", () => {
	test("returns null when no error field exists", () => {
		expect(getBetterAuthClientErrorMessage({ data: { ok: true } })).toBeNull();
	});

	test("extracts message from string and structured errors", () => {
		expect(getBetterAuthClientErrorMessage({ error: "Request failed" })).toBe(
			"Request failed",
		);
		expect(
			getBetterAuthClientErrorMessage({
				error: { message: "OAuth provider unavailable", status: 500 },
			}),
		).toBe("OAuth provider unavailable");
	});

	test("falls back to status text/status code/default message", () => {
		expect(
			getBetterAuthClientErrorMessage({
				error: { statusText: "Internal Server Error" },
			}),
		).toBe("Internal Server Error");
		expect(getBetterAuthClientErrorMessage({ error: { status: 500 } })).toBe(
			"Sign-in failed (500).",
		);
		expect(getBetterAuthClientErrorMessage({ error: {} })).toBe(
			"Unable to start Google sign-in. Please try again.",
		);
	});
});

describe("getSignInFailureMessage", () => {
	test("returns explicit messages from Error or string", () => {
		expect(getSignInFailureMessage(new Error("Network error"))).toBe(
			"Network error",
		);
		expect(getSignInFailureMessage("Request failed")).toBe("Request failed");
	});

	test("returns fallback message for unknown values", () => {
		expect(getSignInFailureMessage(null)).toBe(
			"Unable to start Google sign-in. Please try again.",
		);
	});
});
