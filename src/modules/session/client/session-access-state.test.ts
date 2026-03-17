import { describe, expect, test } from "vitest";
import {
	activateSessionAccess,
	applySessionAccessPublicConfig,
	canSubmitWithSessionAccess,
	hasFreshSessionAccess,
	resetSessionAccessTurnstile,
	SESSION_UNAVAILABLE_MESSAGE,
	type SessionAccessState,
	storeTurnstileToken,
} from "./session-access-state";

function createState(
	overrides: Partial<SessionAccessState> = {},
): SessionAccessState {
	return {
		hasLoadedPublicConfig: false,
		turnstileSiteKey: "",
		hasSessionAccess: false,
		sessionBindingId: null,
		sessionAccessExpiresAt: null,
		turnstileToken: null,
		turnstileWidgetKey: 0,
		error: null,
		...overrides,
	};
}

describe("session access state", () => {
	test("should store the binding and expiry when public config reports active session access", () => {
		const nextState = applySessionAccessPublicConfig(
			createState(),
			{
				turnstileSiteKey: "site-key",
				hasSessionAccess: true,
				sessionBindingId: "binding-1",
			},
			1_000,
		);

		expect(nextState).toMatchObject({
			hasLoadedPublicConfig: true,
			turnstileSiteKey: "site-key",
			hasSessionAccess: true,
			sessionBindingId: "binding-1",
			sessionAccessExpiresAt: expect.any(Number),
		});
		expect(nextState.sessionAccessExpiresAt).toBeGreaterThan(1_000);
	});

	test("should preserve the binding when public config reports stale session access", () => {
		const nextState = applySessionAccessPublicConfig(
			createState(),
			{
				turnstileSiteKey: "site-key",
				hasSessionAccess: false,
				sessionBindingId: "binding-1",
			},
			1_000,
		);

		expect(nextState).toMatchObject({
			hasLoadedPublicConfig: true,
			turnstileSiteKey: "site-key",
			hasSessionAccess: false,
			sessionBindingId: "binding-1",
			sessionAccessExpiresAt: null,
		});
	});

	test("should report stale access when the expiry has already passed", () => {
		expect(
			hasFreshSessionAccess(
				createState({
					hasSessionAccess: true,
					sessionAccessExpiresAt: 999,
				}),
				1_000,
			),
		).toBe(false);
	});

	test("should keep submit disabled until there is fresh access or a turnstile token", () => {
		expect(
			canSubmitWithSessionAccess(
				createState({
					hasLoadedPublicConfig: true,
				}),
			),
		).toBe(false);
		expect(
			canSubmitWithSessionAccess(
				createState({
					hasLoadedPublicConfig: true,
					turnstileToken: "token-1",
				}),
			),
		).toBe(true);
	});

	test("should fail closed when activation is attempted without a binding id", () => {
		const nextState = activateSessionAccess(createState(), null, 1_000);

		expect(nextState).toMatchObject({
			hasSessionAccess: false,
			sessionBindingId: null,
			sessionAccessExpiresAt: null,
			error: SESSION_UNAVAILABLE_MESSAGE,
		});
	});

	test("should clear access state and increment the widget key when the turnstile resets", () => {
		const nextState = resetSessionAccessTurnstile(
			storeTurnstileToken(
				createState({
					hasSessionAccess: true,
					sessionBindingId: "binding-1",
					sessionAccessExpiresAt: 5_000,
					turnstileWidgetKey: 2,
				}),
				"token-1",
			),
			"retry",
		);

		expect(nextState).toMatchObject({
			hasSessionAccess: false,
			sessionBindingId: null,
			sessionAccessExpiresAt: null,
			turnstileToken: null,
			turnstileWidgetKey: 3,
			error: "retry",
		});
	});
});
