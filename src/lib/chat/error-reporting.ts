import { getCloudflareRequestMetadata } from "./cloudflare";

export function reportChatRouteError(input: {
	request: Request;
	requestId: string;
	route: string;
	stage: string;
	error: unknown;
	userId?: string | null;
	chatId?: string | null;
}) {
	const metadata = getCloudflareRequestMetadata(input.request);

	console.error(
		JSON.stringify({
			scope: "chat_api",
			level: "error",
			route: input.route,
			stage: input.stage,
			requestId: input.requestId,
			userId: input.userId ?? null,
			chatId: input.chatId ?? null,
			cfRay: metadata.cfRay,
			cfColo: metadata.cfColo,
			cfCountry: metadata.cfCountry,
			error: input.error instanceof Error ? input.error.message : "unknown",
		}),
	);
}
