import { auth } from "@/services/auth";
import {
	buildUntrustedRequestResponse,
	hasTrustedPostRequestProvenance,
} from "@/lib/security/request-provenance";
import { SESSION_RESET_RESPONSE_HEADER } from "../constants";

type BlockedChatSessionAccess = {
	ok: false;
	response: Response;
};

type AllowedChatSessionAccess = {
	ok: true;
	userId: string;
};

export type ChatSessionAccessResult =
	| BlockedChatSessionAccess
	| AllowedChatSessionAccess;

function jsonError(status: number, error: string) {
	return Response.json({ error }, { status });
}

function buildSessionResetResponse() {
	const response = jsonError(
		401,
		"We couldn't keep your chat session active. Restarting chat is required.",
	);
	response.headers.set(SESSION_RESET_RESPONSE_HEADER, "true");
	return response;
}

export async function resolveChatSessionAccess(input: {
	request: Request;
}): Promise<ChatSessionAccessResult> {
	const request = input.request as Request;

	if (!hasTrustedPostRequestProvenance(request)) {
		return {
			ok: false,
			response: buildUntrustedRequestResponse(),
		};
	}

	const existingSession = await auth.api.getSession({
		headers: request.headers,
	});
	const userId =
		typeof existingSession?.user?.id === "string"
			? existingSession.user.id
			: null;
	if (userId) {
		return {
			ok: true,
			userId,
		};
	}

	if (request.headers.get("x-ore-active-session") === "true") {
		return {
			ok: false,
			response: buildSessionResetResponse(),
		};
	}

	return {
		ok: false,
		response: jsonError(401, "Session access required."),
	};
}
