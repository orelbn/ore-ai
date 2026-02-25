import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import type { ToolSet } from "ai";

const toolAlpha = {
	execute: async () => ({ ok: true }),
} as unknown as ToolSet[string];
const toolBeta = {
	execute: async () => ({ ok: true }),
} as unknown as ToolSet[string];

const state = {
	tools: {} as ToolSet,
	toolsError: null as Error | null,
	createClientCalls: 0,
	closeCalls: 0,
	toolExecuteCalls: 0,
	lastTransportOptions: null as {
		requestInit?: RequestInit;
		fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	} | null,
};

function resetState() {
	state.tools = {
		"ore.context.alpha": toolAlpha,
		"not.allowed.tool": toolBeta,
	};
	state.toolsError = null;
	state.createClientCalls = 0;
	state.closeCalls = 0;
	state.toolExecuteCalls = 0;
	state.lastTransportOptions = null;
}

class MockStreamableHTTPClientTransport {
	readonly url: URL;
	readonly options: {
		requestInit?: RequestInit;
		fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};

	constructor(
		url: URL,
		options: {
			requestInit?: RequestInit;
			fetch?: (
				input: RequestInfo | URL,
				init?: RequestInit,
			) => Promise<Response>;
		},
	) {
		this.url = url;
		this.options = options;
		state.lastTransportOptions = options;
	}
}

mock.module("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
	StreamableHTTPClientTransport: MockStreamableHTTPClientTransport,
}));

mock.module("@ai-sdk/mcp", () => ({
	createMCPClient: async () => {
		state.createClientCalls += 1;
		let isClosed = false;
		return {
			tools: async () => {
				if (state.toolsError) {
					throw state.toolsError;
				}
				return Object.fromEntries(
					Object.entries(state.tools).map(([name, tool]) => [
						name,
						{
							...(tool as object),
							execute: async (...args: unknown[]) => {
								if (isClosed) {
									throw new Error(
										"Attempted to call tool from a closed client",
									);
								}
								state.toolExecuteCalls += 1;
								return await (
									tool as {
										execute?: (...innerArgs: unknown[]) => Promise<unknown>;
									}
								).execute?.(...args);
							},
						},
					]),
				) as ToolSet;
			},
			close: async () => {
				isClosed = true;
				state.closeCalls += 1;
			},
		};
	},
}));

let resolveOreAiMcpTools: typeof import("./ore-ai-mcp-tools").resolveOreAiMcpTools;
let resetOreAiMcpToolsCacheForTests: typeof import("./ore-ai-mcp-tools").resetOreAiMcpToolsCacheForTests;
let ORE_AI_MCP_TOOL_CACHE_TTL_MS: typeof import("./ore-ai-mcp-tools").ORE_AI_MCP_TOOL_CACHE_TTL_MS;

beforeAll(async () => {
	({
		resolveOreAiMcpTools,
		resetOreAiMcpToolsCacheForTests,
		ORE_AI_MCP_TOOL_CACHE_TTL_MS,
	} = await import("./ore-ai-mcp-tools"));
});

beforeEach(() => {
	resetOreAiMcpToolsCacheForTests();
	resetState();
});

afterAll(() => {
	mock.restore();
});

function createMcpServiceBinding() {
	return {
		fetch: async (_input: RequestInfo | URL, _init?: RequestInit) =>
			new Response("ok"),
	};
}

describe("resolveOreAiMcpTools", () => {
	test("sends required MCP auth headers and filters tools by ore.context prefix", async () => {
		const result = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
		});

		const headers = new Headers(
			state.lastTransportOptions?.requestInit?.headers as HeadersInit,
		);

		expect(headers.get("x-ore-internal-secret")).toBe("mcp-secret");
		expect(headers.get("x-ore-user-id")).toBe("user-1");
		expect(headers.get("x-ore-request-id")).toBe("request-1");
		expect(Object.keys(result)).toEqual(["ore.context.alpha"]);
		await expect(result["ore.context.alpha"]?.execute?.({})).resolves.toEqual({
			ok: true,
		});
		expect(state.closeCalls).toBe(0);
		expect(state.toolExecuteCalls).toBe(1);
	});

	test("uses fresh cache and skips MCP discovery until cache expiry", async () => {
		let now = 10;
		const nowFn = () => now;

		const first = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			now: nowFn,
		});

		state.tools = {
			"ore.context.beta": toolBeta,
		};
		now = 1000;

		const second = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			now: nowFn,
		});

		expect(Object.keys(first)).toEqual(["ore.context.alpha"]);
		expect(Object.keys(second)).toEqual(["ore.context.alpha"]);
		expect(state.createClientCalls).toBe(1);
		expect(state.closeCalls).toBe(0);
	});

	test("does not reuse cached tools between different users", async () => {
		let now = 10;
		const nowFn = () => now;

		const firstUserTools = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			now: nowFn,
		});

		state.tools = {
			"ore.context.beta": toolBeta,
		};
		now = 1000;

		const secondUserTools = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-2",
			requestId: "request-2",
			now: nowFn,
		});

		expect(Object.keys(firstUserTools)).toEqual(["ore.context.alpha"]);
		expect(Object.keys(secondUserTools)).toEqual(["ore.context.beta"]);
		expect(state.createClientCalls).toBe(2);
		expect(state.closeCalls).toBe(0);
	});

	test("returns stale cache when refresh fails after ttl", async () => {
		let now = 10;
		const nowFn = () => now;

		await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			now: nowFn,
		});

		now = ORE_AI_MCP_TOOL_CACHE_TTL_MS + 50;
		state.toolsError = new Error("mcp unavailable");

		const fallback = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			now: nowFn,
		});

		expect(Object.keys(fallback)).toEqual(["ore.context.alpha"]);
		expect(state.createClientCalls).toBe(2);
		expect(state.closeCalls).toBe(1);
	});

	test("returns empty tools when no cache exists and discovery fails", async () => {
		state.toolsError = new Error("mcp unavailable");

		const result = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
		});

		expect(result).toEqual({});
		expect(state.createClientCalls).toBe(1);
		expect(state.closeCalls).toBe(1);
	});

	test("does not fall back to another user's stale cache when refresh fails", async () => {
		let now = 10;
		const nowFn = () => now;

		await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			now: nowFn,
		});

		now = ORE_AI_MCP_TOOL_CACHE_TTL_MS + 50;
		state.toolsError = new Error("mcp unavailable");

		const result = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-2",
			requestId: "request-2",
			now: nowFn,
		});

		expect(result).toEqual({});
		expect(state.createClientCalls).toBe(2);
		expect(state.closeCalls).toBe(1);
	});
});
