import { auth } from "@/services/auth";

export async function getActiveSessionUserId(
	headers: Headers,
): Promise<string | null> {
	const session = await auth.api.getSession({ headers });
	return typeof session?.user?.id === "string" ? session.user.id : null;
}
