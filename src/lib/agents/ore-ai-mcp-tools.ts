import { createMCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ORE_AI_MCP_URL = "https://ore-ai-mcp.internal/mcp";
const ORE_CONTEXT_TOOL_PREFIX = "ore.context.";

export interface OreAiMcpServiceBinding {
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface ResolveOreAiMcpToolsInput {
	mcpServiceBinding: OreAiMcpServiceBinding;
	internalSecret: string;
	userId: string;
	requestId: string;
}

export interface ResolvedOreAiMcpTools {
	tools: ToolSet;
	close: () => Promise<void>;
}

function filterContextTools(tools: ToolSet): ToolSet {
	return Object.fromEntries(
		Object.entries(tools).filter(([toolName]) =>
			toolName.startsWith(ORE_CONTEXT_TOOL_PREFIX),
		),
	) as ToolSet;
}

const closeNoop = async () => {};

async function closeMcpClient(
	client: Awaited<ReturnType<typeof createMCPClient>>,
) {
	await client.close().catch(() => {});
}

function createCloseOnce(closeFn: () => Promise<void>): () => Promise<void> {
	let closePromise: Promise<void> | null = null;
	return async () => {
		if (!closePromise) {
			closePromise = closeFn();
		}
		await closePromise;
	};
}

export async function resolveOreAiMcpTools(
	input: ResolveOreAiMcpToolsInput,
): Promise<ResolvedOreAiMcpTools> {
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
		const discoveredClient = mcpClient;

		const discoveredTools = await discoveredClient.tools();
		const filteredTools = filterContextTools(discoveredTools);
		const close = createCloseOnce(() => closeMcpClient(discoveredClient));

		return {
			tools: filteredTools,
			close,
		};
	} catch (error) {
		if (mcpClient) {
			await closeMcpClient(mcpClient);
		}

		console.warn(
			JSON.stringify({
				scope: "ore_ai_mcp_tools",
				level: "warn",
				message: "mcp discovery failed, using empty tools",
				requestId: input.requestId,
				error: error instanceof Error ? error.message : "unknown",
			}),
		);

		return {
			tools: {},
			close: closeNoop,
		};
	}
}
