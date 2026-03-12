import { describe, expect, test } from "vitest";
import { getCloudflareRequestMetadata } from "./cloudflare";

describe("getCloudflareRequestMetadata", () => {
	test("extracts cf-ray and colo from valid ray header", () => {
		const request = new Request("http://localhost", {
			headers: {
				"cf-ray": "8f22ee9988776655-SJC",
				"cf-ipcountry": "US",
			},
		});

		expect(getCloudflareRequestMetadata(request)).toEqual({
			cfRay: "8f22ee9988776655-SJC",
			cfColo: "SJC",
			cfCountry: "US",
		});
	});

	test("returns null colo for malformed cf-ray", () => {
		const request = new Request("http://localhost", {
			headers: { "cf-ray": "invalidray" },
		});

		expect(getCloudflareRequestMetadata(request)).toEqual({
			cfRay: "invalidray",
			cfColo: null,
			cfCountry: null,
		});
	});

	test("handles missing headers", () => {
		expect(
			getCloudflareRequestMetadata(new Request("http://localhost")),
		).toEqual({
			cfRay: null,
			cfColo: null,
			cfCountry: null,
		});
	});
});
