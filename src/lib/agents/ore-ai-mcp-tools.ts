import type { ToolSet } from "ai";
import { resolveMcpToolsFromServers } from "../mcp/tooling";
import type { McpServiceBinding, McpServerDefinition } from "../mcp/types";

export interface ResolveOreAiMcpToolsInput {
	mcpServiceBinding: McpServiceBinding;
	internalSecret: string;
	userId: string;
	requestId: string;
	mcpServerUrl: string;
	directFetch?: McpServerDefinition["directFetch"];
}

export interface ResolvedOreAiMcpTools {
	tools: ToolSet;
	close: () => Promise<void>;
}

export type OreAiMcpServiceBinding = McpServiceBinding;

export async function resolveOreAiMcpTools(
	input: ResolveOreAiMcpToolsInput,
): Promise<ResolvedOreAiMcpTools> {
	const requestHeaders = {
		"x-ore-internal-secret": input.internalSecret,
		"x-ore-user-id": input.userId,
		"x-ore-request-id": input.requestId,
	};

	return resolveMcpToolsFromServers({
		requestId: input.requestId,
		servers: [
			{
				serverName: "ore_ai_mcp",
				serverUrl: input.mcpServerUrl,
				serviceBinding: input.mcpServiceBinding,
				directFetch: input.directFetch,
				requestHeaders,
			},
		],
	});
}
