"use client";

import { TurnstileWidget } from "@/services/cloudflare/turnstile-widget";

type VerificationChallengeProps = {
	action: string;
	onError: () => void;
	onExpired: () => void;
	onToken: (token: string) => void;
	siteKey: string;
	widgetKey: number;
};

export function VerificationChallenge({
	action,
	onError,
	onExpired,
	onToken,
	siteKey,
	widgetKey,
}: VerificationChallengeProps) {
	return (
		<div className="mt-3 flex justify-center">
			<TurnstileWidget
				key={widgetKey}
				action={action}
				appearance="always"
				onError={onError}
				onExpired={onExpired}
				onToken={onToken}
				siteKey={siteKey}
			/>
		</div>
	);
}
