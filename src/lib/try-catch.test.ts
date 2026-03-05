import { describe, expect, test } from "bun:test";
import { tryCatch } from "./try-catch";

describe("tryCatch", () => {
	test("returns success result for resolved promise", async () => {
		const result = await tryCatch(Promise.resolve(42));
		expect(result).toEqual({ data: 42, error: null });
	});

	test("returns failure result for rejected promise", async () => {
		const error = new Error("boom");
		const result = await tryCatch(Promise.reject(error));
		expect(result.data).toBeNull();
		expect(result.error).toBe(error);
	});
});
