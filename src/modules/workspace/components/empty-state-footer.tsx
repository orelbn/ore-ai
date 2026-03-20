"use client";

export function EmptyStateFooter() {
	return (
		<p className="mt-6 text-center text-xs text-muted-foreground">
			By using this application, you agree to our{" "}
			<a
				href="/terms"
				className="underline underline-offset-2 transition-colors hover:text-foreground"
			>
				Terms of Service
			</a>{" "}
			and{" "}
			<a
				href="/privacy"
				className="underline underline-offset-2 transition-colors hover:text-foreground"
			>
				Privacy Policy
			</a>
			.
		</p>
	);
}
