import type { ToolSet } from "ai";
import {
	resolveMcpToolsFromServers,
	type McpServiceBinding,
} from "./mcp-tooling";

const ORE_CONTEXT_TOOL_PREFIX = "ore.context.";

export interface ResolveOreAiMcpToolsInput {
	mcpServiceBinding: McpServiceBinding;
	internalSecret: string;
	userId: string;
	requestId: string;
	mcpServerUrl: string;
}

export interface ResolvedOreAiMcpTools {
	tools: ToolSet;
	close: () => Promise<void>;
}

export type OreAiMcpServiceBinding = McpServiceBinding;

export async function resolveOreAiMcpTools(
	input: ResolveOreAiMcpToolsInput,
): Promise<ResolvedOreAiMcpTools> {
	return resolveMcpToolsFromServers({
		requestId: input.requestId,
		servers: [
			{
				serverName: "ore_ai_mcp",
				serverUrl: input.mcpServerUrl,
				serviceBinding: input.mcpServiceBinding,
				requestHeaders: {
					"x-ore-internal-secret": input.internalSecret,
					"x-ore-user-id": input.userId,
					"x-ore-request-id": input.requestId,
				},
				toolNameFilter: (toolName) =>
					toolName.startsWith(ORE_CONTEXT_TOOL_PREFIX),
			},
		],
	});
}
