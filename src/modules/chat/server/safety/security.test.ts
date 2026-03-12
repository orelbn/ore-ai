import { describe, expect, test } from "vitest";
import { getClientIp, hashIpAddress } from "./security";

describe("chat security helpers", () => {
	test("prefers cf-connecting-ip header", () => {
		const request = new Request("http://localhost", {
			headers: {
				"cf-connecting-ip": "198.51.100.10",
				"x-forwarded-for": "203.0.113.2",
			},
		});

		expect(getClientIp(request)).toBe("198.51.100.10");
	});

	test("falls back to first x-forwarded-for IP", () => {
		const request = new Request("http://localhost", {
			headers: {
				"x-forwarded-for": "203.0.113.2, 198.51.100.11",
			},
		});

		expect(getClientIp(request)).toBe("203.0.113.2");
	});

	test("returns null when no client ip headers are present", () => {
		expect(getClientIp(new Request("http://localhost"))).toBeNull();
	});

	test("hashIpAddress is deterministic and secret-scoped", async () => {
		const hashA1 = await hashIpAddress("203.0.113.7", "secret-a");
		const hashA2 = await hashIpAddress("203.0.113.7", "secret-a");
		const hashB = await hashIpAddress("203.0.113.7", "secret-b");

		expect(hashA1).toHaveLength(64);
		expect(hashA1).toBe(hashA2);
		expect(hashA1).not.toBe(hashB);
	});
});
