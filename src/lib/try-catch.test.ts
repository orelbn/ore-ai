import { describe, expect, test } from "vitest";
import { tryCatch, tryCatchAsync } from "./try-catch";

describe("tryCatch", () => {
	test("should return data and no error when the sync callback succeeds", () => {
		const result = tryCatch((value: number) => value * 2)(21);
		expect(result).toEqual({ data: 42, error: null });
	});

	test("should return the thrown Error when the sync callback throws", () => {
		const error = new Error("boom");
		const result = tryCatch(() => {
			throw error;
		})();

		expect(result.data).toBeNull();
		expect(result.error).toBe(error);
	});

	test("should normalize non-Error throws into Error instances", () => {
		const result = tryCatch(() => {
			throw "boom";
		})();

		expect(result.data).toBeNull();
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe("boom");
	});
});

describe("tryCatchAsync", () => {
	test("should return data and no error when the async callback resolves", async () => {
		const result = await tryCatchAsync(async (value: number) => value * 2)(21);
		expect(result).toEqual({ data: 42, error: null });
	});

	test("should return the rejection error when the async callback rejects", async () => {
		const error = new Error("boom");
		const result = await tryCatchAsync(async () => Promise.reject(error))();

		expect(result.data).toBeNull();
		expect(result.error).toBe(error);
	});

	test("should normalize non-Error async throws into Error instances", async () => {
		const result = await tryCatchAsync(async () => {
			throw "boom";
		})();

		expect(result.data).toBeNull();
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe("boom");
	});
});
