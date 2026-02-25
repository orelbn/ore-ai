export const CHAT_CONTEXT_WINDOW_SIZE = 50;
export const CHAT_MAX_BODY_BYTES = 64 * 1024;
export const CHAT_MAX_MESSAGE_CHARS = 2000;
export const CHAT_MAX_ID_LENGTH = 128;
export const CHAT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export const CHAT_RATE_WINDOW_MS = 60_000;
export const CHAT_RATE_LIMIT_PER_USER = 20;
export const CHAT_RATE_LIMIT_PER_IP = 40;

export const CHAT_DEFAULT_TITLE = "New chat";
export const CHAT_TITLE_MAX_CHARS = 64;
export const CHAT_PREVIEW_MAX_CHARS = 180;
