import { getDb } from "@/db";
import { chatMessages } from "@/db/schema/chat";
import { and, eq, gt, sql } from "drizzle-orm";
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

function toCount(value: number | string | null): number {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		return Number.parseInt(value, 10) || 0;
	}
	return 0;
}

export async function checkChatRateLimit(input: {
	userId: string;
	ipHash: string | null;
}): Promise<ChatRateLimitResult> {
	const db = await getDb();
	const since = new Date(Date.now() - CHAT_RATE_WINDOW_MS);

	const userCountPromise = db
		.select({ count: sql<number>`count(*)` })
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.userId, input.userId),
				eq(chatMessages.role, "user"),
				gt(chatMessages.createdAt, since),
			),
		)
		.then((rows) => toCount(rows[0]?.count ?? 0));

	const ipCountPromise = input.ipHash
		? db
				.select({ count: sql<number>`count(*)` })
				.from(chatMessages)
				.where(
					and(
						eq(chatMessages.ipHash, input.ipHash),
						eq(chatMessages.role, "user"),
						gt(chatMessages.createdAt, since),
					),
				)
				.then((rows) => toCount(rows[0]?.count ?? 0))
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
