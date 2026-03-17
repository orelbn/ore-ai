import { tryCatch } from "@/lib/try-catch";

const ALLOWED_SEC_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

export function hasTrustedPostRequestProvenance(request: Request): boolean {
	const requestOrigin = new URL(request.url).origin;
	const origin = request.headers.get("origin")?.trim();
	if (origin) {
		const parsedOrigin = tryCatch((value: string) => new URL(value))(origin);
		if (parsedOrigin.error || parsedOrigin.data.origin !== requestOrigin) {
			return false;
		}
	}

	const secFetchSite = request.headers
		.get("sec-fetch-site")
		?.trim()
		.toLowerCase();
	if (secFetchSite && !ALLOWED_SEC_FETCH_SITES.has(secFetchSite)) {
		return false;
	}

	return true;
}

export function buildUntrustedRequestResponse(): Response {
	return Response.json({ error: "Invalid request." }, { status: 403 });
}
