import { applyAnonymousRateLimit } from "@/lib/security/rate-limit";
import { requireSessionAccess } from "./verification";

type ChatAccessEnv = {
	SESSION_ACCESS_SECRET?: string;
};

export async function enforceChatSessionAccess(input: {
	request: Request;
	env: ChatAccessEnv;
}): Promise<Response | null> {
	const sessionSecret = input.env.SESSION_ACCESS_SECRET?.trim();
	if (!sessionSecret) {
		return Response.json(
			{ error: "Session verification is unavailable." },
			{ status: 503 },
		);
	}

	const sessionAccessResponse = await requireSessionAccess({
		request: input.request,
		sessionSecret,
	});
	if (sessionAccessResponse) {
		return sessionAccessResponse;
	}

	return applyAnonymousRateLimit({
		env: input.env,
		request: input.request,
		scope: "chat",
	});
}
