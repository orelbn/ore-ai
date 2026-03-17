import { z } from "zod";

export const serverGeneratedMessageMetadataSchema = z.object({
	serverSignature: z.string().trim().min(1),
});

export type ServerGeneratedMessageMetadata = z.infer<
	typeof serverGeneratedMessageMetadataSchema
>;

export function parseServerGeneratedMessageMetadata(
	value: unknown,
): ServerGeneratedMessageMetadata | null {
	const parsed = serverGeneratedMessageMetadataSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}

export function isServerGeneratedMessageMetadata(
	value: unknown,
): value is ServerGeneratedMessageMetadata {
	return parseServerGeneratedMessageMetadata(value) !== null;
}
