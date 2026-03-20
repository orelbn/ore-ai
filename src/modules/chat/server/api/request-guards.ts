import type { ConversationMessage } from "../../types";
import type { ChatRequestError } from "../../errors/chat-request-error";
import { jsonError } from "./http";
import {
	assertRequestBodySize,
	parseAndValidateChatRequest,
} from "../../schema/validation";

export async function validateChatPostRequest(
	request: Request,
): Promise<{ conversationId: string; message: ConversationMessage }> {
	const rawBody = await request.text();
	assertRequestBodySize(request.headers, rawBody);
	return await parseAndValidateChatRequest(rawBody);
}

export function mapChatRequestErrorToResponse(
	error: ChatRequestError,
): Response {
	if (error.status === 413) {
		return jsonError(413, "Message is too large.");
	}

	return jsonError(error.status, "Invalid request.");
}
