import { createHmac, timingSafeEqual } from "node:crypto";
import type { UIMessage } from "ai";
import type { ServerGeneratedMessageMetadata } from "../messages/server-message-metadata";
import { parseServerGeneratedMessageMetadata } from "../messages/server-message-metadata";

type SupportedMessage = Pick<UIMessage, "id" | "role" | "parts" | "metadata">;
type MessageIntegrityContext = {
	conversationId: string;
	sessionBindingId: string;
};

function encodeCanonicalJson(value: unknown): string {
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => encodeCanonicalJson(item)).join(",")}]`;
	}

	if (typeof value === "object") {
		const entries = Object.entries(value)
			.filter(([, entryValue]) => entryValue !== undefined)
			.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
		return `{${entries
			.map(
				([entryKey, entryValue]) =>
					`${JSON.stringify(entryKey)}:${encodeCanonicalJson(entryValue)}`,
			)
			.join(",")}}`;
	}

	throw new TypeError("Unsupported value in server-signed message.");
}

function buildMessagePayload(
	message: SupportedMessage,
	context: MessageIntegrityContext,
): string {
	return encodeCanonicalJson({
		conversationId: context.conversationId,
		id: message.id,
		role: message.role,
		sessionBindingId: context.sessionBindingId,
		parts: message.parts,
	});
}

function signMessagePayload(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload).digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}

	return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createServerGeneratedMessageMetadata(input: {
	message: SupportedMessage;
	secret: string;
	conversationId: string;
	sessionBindingId: string;
}): ServerGeneratedMessageMetadata {
	return {
		serverSignature: signMessagePayload(
			buildMessagePayload(input.message, input),
			input.secret,
		),
	};
}

export function hasValidServerGeneratedMessageSignature(input: {
	message: SupportedMessage;
	secret: string;
	conversationId: string;
	sessionBindingId: string;
}): boolean {
	const metadata = parseServerGeneratedMessageMetadata(input.message.metadata);
	if (!metadata) {
		return false;
	}

	const expectedSignature = signMessagePayload(
		buildMessagePayload(input.message, input),
		input.secret,
	);
	return constantTimeEqual(metadata.serverSignature, expectedSignature);
}
