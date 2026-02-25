const LOCAL_TEST_AUTH_ENABLED_ENV = "LOCAL_TEST_AUTH_ENABLED";

function isLocalhostUrl(url: string) {
	try {
		const hostname = new URL(url).hostname;
		return (
			hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
		);
	} catch {
		return false;
	}
}

export function getLocalTestEmailPasswordConfig(baseUrl: string) {
	const envValues = process.env as Record<string, string | undefined>;
	const isEnabled =
		isLocalhostUrl(baseUrl) &&
		envValues[LOCAL_TEST_AUTH_ENABLED_ENV] === "true";

	if (!isEnabled) {
		return undefined;
	}

	return {
		enabled: true,
	} as const;
}
