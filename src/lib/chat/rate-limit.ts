import {
	queryIpMessageCountSince,
	queryUserMessageCountSince,
} from "@/db/query";
import {
	CHAT_RATE_LIMIT_PER_IP,
	CHAT_RATE_LIMIT_PER_USER,
	CHAT_RATE_WINDOW_MS,
} from "./constants";

export type ChatRateLimitResult = {
	limited: boolean;
	reason: "user" | "ip" | null;
	userCount: number;
	ipCount: number;
};

export async function checkChatRateLimit(input: {
	userId: string;
	ipHash: string | null;
}): Promise<ChatRateLimitResult> {
	const since = new Date(Date.now() - CHAT_RATE_WINDOW_MS);

	const userCountPromise = queryUserMessageCountSince({
		userId: input.userId,
		since,
	});

	const ipCountPromise = input.ipHash
		? queryIpMessageCountSince({
				ipHash: input.ipHash,
				since,
			})
		: Promise.resolve(0);

	const [userCount, ipCount] = await Promise.all([
		userCountPromise,
		ipCountPromise,
	]);

	if (userCount >= CHAT_RATE_LIMIT_PER_USER) {
		return {
			limited: true,
			reason: "user",
			userCount,
			ipCount,
		};
	}

	if (input.ipHash && ipCount >= CHAT_RATE_LIMIT_PER_IP) {
		return {
			limited: true,
			reason: "ip",
			userCount,
			ipCount,
		};
	}

	return {
		limited: false,
		reason: null,
		userCount,
		ipCount,
	};
}
