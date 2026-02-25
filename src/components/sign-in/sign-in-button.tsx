"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { useState } from "react";
import { GoogleIcon } from "./google-icon";
import {
	getBetterAuthClientErrorMessage,
	getSignInFailureMessage,
} from "./sign-in-errors";

export function SignInButton() {
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleGoogleSignIn() {
		if (isLoading) {
			return;
		}

		setIsLoading(true);
		setErrorMessage(null);
		try {
			const result = await signIn.social({
				provider: "google",
				callbackURL: "/",
			});
			const signInError = getBetterAuthClientErrorMessage(result);
			if (signInError) {
				setErrorMessage(signInError);
			}
		} catch (error) {
			setErrorMessage(getSignInFailureMessage(error));
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="flex w-full flex-col items-center gap-2">
			<Button
				variant="outline"
				size="lg"
				className="gap-3 border-border/60 bg-background/50 px-6 text-sm font-medium transition-colors duration-200 hover:border-primary/40 hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-primary/50"
				onClick={handleGoogleSignIn}
				disabled={isLoading}
				aria-label="Sign in with Google"
			>
				{isLoading ? (
					<>
						<svg
							className="h-4 w-4 animate-spin text-muted-foreground"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							/>
						</svg>
						<span aria-live="polite">Redirecting&#8230;</span>
					</>
				) : (
					<>
						<GoogleIcon size={16} />
						Continue with Google
					</>
				)}
			</Button>
			{errorMessage ? (
				<p
					role="alert"
					className="max-w-xs text-center text-xs text-destructive"
					aria-live="polite"
				>
					{errorMessage}
				</p>
			) : null}
		</div>
	);
}
