// Re-export UI-safe chat limits so existing server imports can continue using
// this module while UI code imports directly from `ui-constants`.
export {
	CHAT_DEFAULT_DRAFT_TITLE,
	CHAT_MAX_MESSAGE_CHARS,
	CHAT_PREVIEW_MAX_CHARS,
	CHAT_TITLE_MAX_CHARS,
} from "./ui-constants";

// Maximum number of UI messages sent to the model for a single turn, including the incoming user message.
export const CHAT_CONTEXT_MESSAGE_LIMIT = 50;
export const CHAT_MAX_BODY_BYTES = 64 * 1024;
export const CHAT_MAX_ID_LENGTH = 128;
export const CHAT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export const CHAT_RATE_WINDOW_MS = 60_000;
export const CHAT_RATE_LIMIT_PER_USER = 20;
export const CHAT_RATE_LIMIT_PER_IP = 40;

export const CHAT_DEFAULT_TITLE = "New chat";
