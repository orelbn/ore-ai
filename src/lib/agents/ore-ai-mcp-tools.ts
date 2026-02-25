import { createMCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ORE_AI_MCP_URL = "https://ore-ai-mcp.internal/mcp";
const ORE_CONTEXT_TOOL_PREFIX = "ore.context.";

export const ORE_AI_MCP_TOOL_CACHE_TTL_MS = 5 * 60 * 1000;

export interface OreAiMcpServiceBinding {
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface ResolveOreAiMcpToolsInput {
	mcpServiceBinding: OreAiMcpServiceBinding;
	internalSecret: string;
	userId: string;
	requestId: string;
	now?: () => number;
}

let cachedTools: ToolSet | null = null;
let cacheExpiresAtMs = 0;

function filterContextTools(tools: ToolSet): ToolSet {
	return Object.fromEntries(
		Object.entries(tools).filter(([toolName]) =>
			toolName.startsWith(ORE_CONTEXT_TOOL_PREFIX),
		),
	) as ToolSet;
}

function isCacheFresh(nowMs: number): boolean {
	return cachedTools !== null && nowMs < cacheExpiresAtMs;
}

export function resetOreAiMcpToolsCacheForTests() {
	cachedTools = null;
	cacheExpiresAtMs = 0;
}

export async function resolveOreAiMcpTools(
	input: ResolveOreAiMcpToolsInput,
): Promise<ToolSet> {
	const nowMs = input.now?.() ?? Date.now();
	if (isCacheFresh(nowMs)) {
		return cachedTools as ToolSet;
	}

	let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
	try {
		const transport = new StreamableHTTPClientTransport(
			new URL(ORE_AI_MCP_URL),
			{
				requestInit: {
					headers: {
						"x-ore-internal-secret": input.internalSecret,
						"x-ore-user-id": input.userId,
						"x-ore-request-id": input.requestId,
					},
				},
				fetch: async (requestInfo, requestInit) => {
					const request =
						requestInfo instanceof Request
							? requestInfo
							: new Request(requestInfo, requestInit);
					return input.mcpServiceBinding.fetch(request);
				},
			},
		);

		mcpClient = await createMCPClient({
			transport,
		});

		const discoveredTools = await mcpClient.tools();
		const filteredTools = filterContextTools(discoveredTools);
		cachedTools = filteredTools;
		cacheExpiresAtMs = nowMs + ORE_AI_MCP_TOOL_CACHE_TTL_MS;
		return filteredTools;
	} catch (error) {
		console.warn(
			JSON.stringify({
				scope: "ore_ai_mcp_tools",
				level: "warn",
				message: "mcp discovery failed, falling back to stale or empty tools",
				requestId: input.requestId,
				error: error instanceof Error ? error.message : "unknown",
				hasCachedTools: cachedTools !== null,
			}),
		);
		return cachedTools ?? {};
	} finally {
		if (mcpClient) {
			await mcpClient.close().catch(() => {});
		}
	}
}
