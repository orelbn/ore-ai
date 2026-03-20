import { createServerEntry } from "@tanstack/react-start/server-entry";
import {
	createStartHandler,
	defaultStreamHandler,
	defineHandlerCallback,
} from "@tanstack/react-start/server";
import {
	buildContentSecurityPolicy,
	generateCspNonce,
} from "@/lib/security/csp";

const handler = defineHandlerCallback(async (ctx) => {
	const nonce = generateCspNonce();

	ctx.router.update({
		ssr: { nonce },
	});

	ctx.responseHeaders.set(
		"Content-Security-Policy",
		buildContentSecurityPolicy(nonce),
	);
	ctx.responseHeaders.set("X-Content-Type-Options", "nosniff");
	ctx.responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
	ctx.responseHeaders.set("X-Frame-Options", "DENY");
	ctx.responseHeaders.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	);

	return defaultStreamHandler(ctx);
});

const fetch = createStartHandler(handler);

export default createServerEntry({
	fetch,
});
