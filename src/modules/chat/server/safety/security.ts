export function getClientIp(request: Request): string | null {
	const directIp = request.headers.get("cf-connecting-ip")?.trim();
	if (directIp) {
		return directIp;
	}

	const forwardedFor = request.headers.get("x-forwarded-for");
	if (!forwardedFor) {
		return null;
	}

	const [firstIp] = forwardedFor.split(",");
	return firstIp?.trim() || null;
}

export async function hashIpAddress(
	ip: string,
	secret: string,
): Promise<string> {
	const payload = `${secret}:${ip}`;
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(payload),
	);
	const bytes = new Uint8Array(digest);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}
