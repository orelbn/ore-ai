import {
	createEmptyConversationSeed,
	loadLatestConversationSeed,
} from "@/modules/chat";
import { getActiveSessionUserId } from "@/modules/session";
import { env } from "cloudflare:workers";

export type IndexRouteLoaderData = {
	hasActiveSession: boolean;
	initialConversationJson: string;
	turnstileSiteKey: string;
};

export async function loadIndexRouteData(
	requestHeaders: Headers,
): Promise<IndexRouteLoaderData> {
	const userId = await getActiveSessionUserId(requestHeaders);
	const initialConversation = userId
		? await loadLatestConversationSeed(userId)
		: createEmptyConversationSeed();

	return {
		hasActiveSession: Boolean(userId),
		initialConversationJson: JSON.stringify(initialConversation),
		turnstileSiteKey: env.TURNSTILE_SITE_KEY?.trim() ?? "",
	};
}
