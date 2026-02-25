export type ChatApiLogEvent = {
	requestId: string;
	route: string;
	status: number;
	durationMs: number;
	userId: string | null;
	chatId: string | null;
	rateLimited: boolean;
	cfRay?: string | null;
	cfColo?: string | null;
	cfCountry?: string | null;
};

export function logChatApiEvent(event: ChatApiLogEvent) {
	console.info(
		JSON.stringify({
			scope: "chat_api",
			...event,
		}),
	);
}
