import type { ToolSet } from "ai";

export interface McpServiceBinding {
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface McpServerDefinition {
	serverName: string;
	serverUrl: string;
	requestHeaders: HeadersInit;
	serviceBinding?: McpServiceBinding;
}

export interface ResolveMcpServersInput {
	requestId: string;
	servers: McpServerDefinition[];
}

export interface ResolvedMcpTools {
	tools: ToolSet;
	close: () => Promise<void>;
}
