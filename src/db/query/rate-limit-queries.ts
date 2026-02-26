import { chatMessages } from "@/db/schema/chat";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDB } from "../index";

function toCount(value: number | string | null): number {
	if (typeof value === "number") return value;
	if (typeof value === "string") return Number.parseInt(value, 10) || 0;
	return 0;
}

export async function queryUserMessageCountSince(input: {
	userId: string;
	since: Date;
}): Promise<number> {
	const db = await getDB();
	const rows = await db
		.select({ count: sql<number>`count(*)` })
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.userId, input.userId),
				eq(chatMessages.role, "user"),
				gt(chatMessages.createdAt, input.since),
			),
		);

	return toCount(rows[0]?.count ?? 0);
}

export async function queryIpMessageCountSince(input: {
	ipHash: string;
	since: Date;
}): Promise<number> {
	const db = await getDB();
	const rows = await db
		.select({ count: sql<number>`count(*)` })
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.ipHash, input.ipHash),
				eq(chatMessages.role, "user"),
				gt(chatMessages.createdAt, input.since),
			),
		);

	return toCount(rows[0]?.count ?? 0);
}
