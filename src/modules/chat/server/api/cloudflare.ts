export type CloudflareRequestMetadata = {
	cfRay: string | null;
	cfColo: string | null;
	cfCountry: string | null;
};

function extractColoFromCfRay(cfRay: string | null): string | null {
	if (!cfRay) {
		return null;
	}

	const parts = cfRay.split("-");
	if (parts.length < 2) {
		return null;
	}

	return parts[parts.length - 1] ?? null;
}

export function getCloudflareRequestMetadata(
	request: Request,
): CloudflareRequestMetadata {
	const cfRay = request.headers.get("cf-ray");
	return {
		cfRay,
		cfColo: extractColoFromCfRay(cfRay),
		cfCountry: request.headers.get("cf-ipcountry"),
	};
}
