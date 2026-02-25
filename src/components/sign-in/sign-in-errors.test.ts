import { describe, expect, test } from "bun:test";
import {
	getBetterAuthClientErrorMessage,
	getSignInFailureMessage,
} from "./sign-in-errors";

describe("getBetterAuthClientErrorMessage", () => {
	test("returns null when no error is present", () => {
		expect(getBetterAuthClientErrorMessage({ data: { ok: true } })).toBeNull();
	});

	test("extracts string error payloads", () => {
		expect(getBetterAuthClientErrorMessage({ error: "Request failed" })).toBe(
			"Request failed",
		);
	});

	test("extracts structured error message payloads", () => {
		expect(
			getBetterAuthClientErrorMessage({
				error: { message: "OAuth provider unavailable", status: 500 },
			}),
		).toBe("OAuth provider unavailable");
	});

	test("falls back to status text or status code when message is missing", () => {
		expect(
			getBetterAuthClientErrorMessage({
				error: { statusText: "Internal Server Error" },
			}),
		).toBe("Internal Server Error");

		expect(
			getBetterAuthClientErrorMessage({
				error: { status: 500 },
			}),
		).toBe("Sign-in failed (500).");
	});
});

describe("getSignInFailureMessage", () => {
	test("returns explicit error messages", () => {
		expect(getSignInFailureMessage(new Error("Network error"))).toBe(
			"Network error",
		);
		expect(getSignInFailureMessage("Request failed")).toBe("Request failed");
	});

	test("returns the fallback message when error is unknown", () => {
		expect(getSignInFailureMessage(null)).toBe(
			"Unable to start Google sign-in. Please try again.",
		);
	});
});
