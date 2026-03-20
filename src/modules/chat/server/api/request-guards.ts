import type { UIMessage } from "ai";
import type { ChatRequestError } from "../../errors/chat-request-error";
import { jsonError } from "./http";
import {
	assertRequestBodySize,
	parseAndValidateChatRequest,
} from "../../schema/validation";

export async function validateChatPostRequest(
	request: Request,
): Promise<{ conversationId: string; message: UIMessage }> {
	const rawBody = await request.text();
	assertRequestBodySize(request.headers, rawBody);
	return parseAndValidateChatRequest(rawBody);
}

export function mapChatRequestErrorToResponse(
	error: ChatRequestError,
): Response {
	if (error.status === 413) {
		return jsonError(413, "Message is too large.");
	}

	return jsonError(error.status, "Invalid request.");
}
