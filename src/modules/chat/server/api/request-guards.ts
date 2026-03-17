import type { UIMessage } from "ai";
import type { ChatRequestError } from "../../errors/chat-request-error";
import { jsonError } from "./http";
import {
	assertRequestBodySize,
	parseAndValidateChatRequest,
} from "../../schema/validation";

export async function validateChatPostRequest(
	request: Request,
	options?: {
		messageIntegritySecret?: string;
		sessionBindingId?: string;
	},
): Promise<{ conversationId: string; messages: UIMessage[] }> {
	const rawBody = await request.text();
	assertRequestBodySize(request.headers, rawBody);
	return parseAndValidateChatRequest(rawBody, options);
}

export function mapChatRequestErrorToResponse(
	error: ChatRequestError,
): Response {
	if (error.status === 413) {
		return jsonError(413, "Message is too large.");
	}

	return jsonError(error.status, "Invalid request.");
}
