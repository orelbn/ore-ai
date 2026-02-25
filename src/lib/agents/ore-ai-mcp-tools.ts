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

interface CachedToolsEntry {
	tools: ToolSet;
	expiresAtMs: number;
	client: Awaited<ReturnType<typeof createMCPClient>>;
}

const cachedToolsByUserId = new Map<string, CachedToolsEntry>();
const inFlightRefreshesByUserId = new Map<string, Promise<ToolSet>>();

function filterContextTools(tools: ToolSet): ToolSet {
	return Object.fromEntries(
		Object.entries(tools).filter(([toolName]) =>
			toolName.startsWith(ORE_CONTEXT_TOOL_PREFIX),
		),
	) as ToolSet;
}

function getCachedTools(userId: string): CachedToolsEntry | undefined {
	return cachedToolsByUserId.get(userId);
}

function isCacheFresh(
	cachedEntry: CachedToolsEntry | undefined,
	nowMs: number,
) {
	return cachedEntry !== undefined && nowMs < cachedEntry.expiresAtMs;
}

async function closeMcpClient(
	client: Awaited<ReturnType<typeof createMCPClient>>,
) {
	await client.close().catch(() => {});
}

function evictExpiredEntries(nowMs: number, activeUserId: string) {
	for (const [userId, entry] of cachedToolsByUserId.entries()) {
		if (
			userId === activeUserId ||
			nowMs < entry.expiresAtMs ||
			inFlightRefreshesByUserId.has(userId)
		) {
			continue;
		}
		cachedToolsByUserId.delete(userId);
		void closeMcpClient(entry.client);
	}
}

export function resetOreAiMcpToolsCacheForTests() {
	for (const entry of cachedToolsByUserId.values()) {
		void closeMcpClient(entry.client);
	}
	cachedToolsByUserId.clear();
	inFlightRefreshesByUserId.clear();
}

export async function resolveOreAiMcpTools(
	input: ResolveOreAiMcpToolsInput,
): Promise<ToolSet> {
	const nowMs = input.now?.() ?? Date.now();
	evictExpiredEntries(nowMs, input.userId);

	const cachedToolsEntry = getCachedTools(input.userId);
	if (isCacheFresh(cachedToolsEntry, nowMs)) {
		return cachedToolsEntry.tools;
	}

	const inFlightRefresh = inFlightRefreshesByUserId.get(input.userId);
	if (inFlightRefresh) {
		return inFlightRefresh;
	}

	const refreshPromise = (async (): Promise<ToolSet> => {
		let discoveredClient: Awaited<ReturnType<typeof createMCPClient>> | null =
			null;
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

			discoveredClient = await createMCPClient({
				transport,
			});

			const discoveredTools = await discoveredClient.tools();
			const filteredTools = filterContextTools(discoveredTools);
			const replacedEntry = cachedToolsByUserId.get(input.userId);
			cachedToolsByUserId.set(input.userId, {
				tools: filteredTools,
				expiresAtMs: nowMs + ORE_AI_MCP_TOOL_CACHE_TTL_MS,
				client: discoveredClient,
			});

			if (replacedEntry && replacedEntry.client !== discoveredClient) {
				void closeMcpClient(replacedEntry.client);
			}
			return filteredTools;
		} catch (error) {
			if (discoveredClient) {
				await closeMcpClient(discoveredClient);
			}

			console.warn(
				JSON.stringify({
					scope: "ore_ai_mcp_tools",
					level: "warn",
					message: "mcp discovery failed, falling back to stale or empty tools",
					requestId: input.requestId,
					error: error instanceof Error ? error.message : "unknown",
					hasCachedTools: cachedToolsEntry !== undefined,
				}),
			);
			return cachedToolsEntry?.tools ?? {};
		}
	})();

	inFlightRefreshesByUserId.set(input.userId, refreshPromise);
	try {
		return await refreshPromise;
	} finally {
		if (inFlightRefreshesByUserId.get(input.userId) === refreshPromise) {
			inFlightRefreshesByUserId.delete(input.userId);
		}
	}
}
