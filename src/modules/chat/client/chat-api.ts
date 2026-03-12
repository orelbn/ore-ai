import { tryCatch } from "@/lib/try-catch";
import { z } from "zod";

const chatSummarySchema = z.object({
	id: z.string(),
	title: z.string(),
	updatedAt: z.number(),
	lastMessagePreview: z.string(),
});

const listChatsResponseSchema = z.object({
	chats: z.array(chatSummarySchema),
});

const chatDetailSchema = z.object({
	id: z.string(),
	title: z.string(),
	messages: z.array(
		z.object({
			id: z.string(),
			role: z.enum(["user", "assistant", "system"]),
			parts: z.array(
				z.object({
					type: z.literal("text"),
					text: z.string(),
				}),
			),
		}),
	),
});

const errorResponseSchema = z.object({
	error: z.string(),
});

export type ChatSummaryDTO = z.infer<typeof chatSummarySchema>;
export type ChatDetailDTO = z.infer<typeof chatDetailSchema>;
export type ListChatsResponseDTO = z.infer<typeof listChatsResponseSchema>;

async function getErrorMessage(response: Response): Promise<string> {
	const parsed = await tryCatch(response.json());
	if (parsed.error) {
		return `Request failed (${response.status})`;
	}

	const validated = errorResponseSchema.safeParse(parsed.data);
	if (!validated.success) {
		return `Request failed (${response.status})`;
	}

	return validated.data.error;
}

export async function listChats(): Promise<ListChatsResponseDTO> {
	const response = await fetch("/api/chats", {
		method: "GET",
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(await getErrorMessage(response));
	}

	const parsed = await tryCatch(response.json());
	if (parsed.error) {
		throw new Error("Invalid JSON response.");
	}

	const validated = listChatsResponseSchema.safeParse(parsed.data);
	if (!validated.success) {
		throw new Error("Invalid chat list response.");
	}

	return validated.data;
}

export async function getChat(chatId: string): Promise<ChatDetailDTO> {
	const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
		method: "GET",
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(await getErrorMessage(response));
	}

	const parsed = await tryCatch(response.json());
	if (parsed.error) {
		throw new Error("Invalid JSON response.");
	}

	const validated = chatDetailSchema.safeParse(parsed.data);
	if (!validated.success) {
		throw new Error("Invalid chat detail response.");
	}

	return validated.data;
}

export async function deleteChat(chatId: string): Promise<void> {
	const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		throw new Error(await getErrorMessage(response));
	}
}
