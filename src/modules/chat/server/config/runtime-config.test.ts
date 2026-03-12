import { afterEach, describe, expect, vi, test } from "vitest";
import { resolveChatRuntimeConfig } from "./runtime-config";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("resolveChatRuntimeConfig", () => {
	test("returns MCP server URL without prompt key", async () => {
		const result = await resolveChatRuntimeConfig({
			MCP_SERVER_URL: "https://ore-ai-mcp/mcp",
		});

		expect(result).toEqual({
			mcpServerUrl: "https://ore-ai-mcp/mcp",
			agentSystemPrompt: undefined,
		});
	});

	test("resolves prompt from R2 when key and bucket are valid", async () => {
		const result = await resolveChatRuntimeConfig({
			MCP_SERVER_URL: "https://ore-ai-mcp/mcp",
			AGENT_PROMPT_KEY: "prompts/prod.txt",
			AGENT_PROMPTS: {
				get: async (key: string) =>
					key === "prompts/prod.txt"
						? { text: async () => "  prompt from R2  " }
						: null,
			},
		});

		expect(result).toEqual({
			mcpServerUrl: "https://ore-ai-mcp/mcp",
			agentSystemPrompt: "prompt from R2",
		});
	});

	test("warns and falls back when prompt storage resolution fails", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await resolveChatRuntimeConfig({
			MCP_SERVER_URL: "https://ore-ai-mcp/mcp",
			AGENT_PROMPT_KEY: "prompts/prod.txt",
		});

		expect(result).toEqual({
			mcpServerUrl: "https://ore-ai-mcp/mcp",
			agentSystemPrompt: undefined,
		});
		expect(warn).toHaveBeenCalledTimes(1);
		const payload = JSON.parse(String(warn.mock.calls[0]?.[0]));
		expect(payload.scope).toBe("chat_runtime_config");
		expect(payload.level).toBe("warn");
		expect(payload.promptKey).toBe("prompts/prod.txt");
	});

	test("throws for invalid runtime config", async () => {
		await expect(
			resolveChatRuntimeConfig({ MCP_SERVER_URL: "not-a-url" }),
		).rejects.toThrow("Invalid chat runtime config");
	});

	test("treats whitespace prompt key as unset", async () => {
		const result = await resolveChatRuntimeConfig({
			MCP_SERVER_URL: "https://ore-ai-mcp/mcp",
			AGENT_PROMPT_KEY: "   ",
		});

		expect(result.agentSystemPrompt).toBeUndefined();
	});
});
