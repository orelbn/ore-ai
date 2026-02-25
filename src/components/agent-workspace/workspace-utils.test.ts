import { describe, expect, test } from "bun:test";
import type { OreAgentUIMessage } from "@/lib/agents/ore-agent";
import {
	buildSessionTitleFromInput,
	createSessionId,
	extractPlainText,
	formatUpdatedAt,
	parseJsonResponse,
} from "./workspace-utils";

describe("workspace utils", () => {
	test("creates a non-empty session id", () => {
		const id = createSessionId();
		expect(id.length).toBeGreaterThan(0);
	});

	test("extracts plain text from mixed message parts", () => {
		const parts = [
			{ type: "text", text: "first line" },
			{ type: "reasoning", text: "internal" },
			{ type: "text", text: "second line" },
		] as unknown as OreAgentUIMessage["parts"];

		expect(extractPlainText(parts)).toBe("first line\nsecond line");
	});

	test("builds a default title for empty input", () => {
		expect(buildSessionTitleFromInput("   ")).toBe("New session");
	});

	test("truncates long titles", () => {
		const title = buildSessionTitleFromInput("a".repeat(120));
		expect(title.length).toBe(64);
	});

	test("formats timestamps", () => {
		const formatted = formatUpdatedAt(
			new Date("2026-02-24T12:00:00Z").getTime(),
		);
		expect(formatted.length).toBeGreaterThan(0);
	});

	test("parses successful JSON responses", async () => {
		const response = new Response(JSON.stringify({ value: 42 }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
		const payload = await parseJsonResponse<{ value: number }>(response);
		expect(payload.value).toBe(42);
	});

	test("throws server error payload messages", async () => {
		const response = new Response(
			JSON.stringify({ error: "Invalid request" }),
			{
				status: 400,
				headers: { "content-type": "application/json" },
			},
		);
		await expect(
			parseJsonResponse<{ value: number }>(response),
		).rejects.toThrow("Invalid request");
	});
});
