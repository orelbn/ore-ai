import type { ToolSet } from "ai";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";

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
	lastTransportOptions: null as {
		requestInit?: RequestInit;
		fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	} | null,
	lastTransportUrl: null as string | null,
};

function resetState() {
	state.tools = {
		"ore.context.alpha": toolAlpha,
		"not.allowed.tool": toolBeta,
	};
	state.toolsError = null;
	state.createClientCalls = 0;
	state.closeCalls = 0;
	state.lastTransportOptions = null;
	state.lastTransportUrl = null;
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
		state.lastTransportUrl = url.toString();
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

beforeAll(async () => {
	({ resolveOreAiMcpTools } = await import("./ore-ai-mcp-tools"));
});

beforeEach(() => {
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

function callToolExecute(tool: ToolSet[string] | undefined) {
	return (
		tool as { execute?: (...args: unknown[]) => Promise<unknown> } | undefined
	)?.execute?.({}, undefined);
}

describe("resolveOreAiMcpTools", () => {
	test("discovers all tools and closes only when requested", async () => {
		const resolved = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			mcpServerUrl: "https://ore-ai-mcp/mcp",
		});

		const headers = new Headers(
			state.lastTransportOptions?.requestInit?.headers as HeadersInit,
		);

		expect(headers.get("x-ore-internal-secret")).toBe("mcp-secret");
		expect(headers.get("x-ore-user-id")).toBe("user-1");
		expect(headers.get("x-ore-request-id")).toBe("request-1");
		expect(Object.keys(resolved.tools).sort()).toEqual([
			"not.allowed.tool",
			"ore.context.alpha",
		]);
		await expect(
			callToolExecute(resolved.tools["ore.context.alpha"]),
		).resolves.toEqual({
			ok: true,
		});
		await expect(
			callToolExecute(resolved.tools["not.allowed.tool"]),
		).resolves.toEqual({
			ok: true,
		});
		expect(state.closeCalls).toBe(0);

		await resolved.close();
		expect(state.closeCalls).toBe(1);
		await expect(
			callToolExecute(resolved.tools["ore.context.alpha"]),
		).rejects.toThrow("closed client");

		await resolved.close();
		expect(state.closeCalls).toBe(1);
	});

	test("performs fresh discovery on every call", async () => {
		const first = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			mcpServerUrl: "https://ore-ai-mcp/mcp",
		});

		state.tools = {
			"ore.context.beta": toolBeta,
		};

		const second = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-2",
			mcpServerUrl: "https://ore-ai-mcp/mcp",
		});

		expect(Object.keys(first.tools).sort()).toEqual([
			"not.allowed.tool",
			"ore.context.alpha",
		]);
		expect(Object.keys(second.tools)).toEqual(["ore.context.beta"]);
		expect(state.createClientCalls).toBe(2);

		await Promise.all([first.close(), second.close()]);
		expect(state.closeCalls).toBe(2);
	});

	test("returns empty tools when discovery fails and closes the client", async () => {
		state.toolsError = new Error("mcp unavailable");

		const resolved = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			mcpServerUrl: "https://ore-ai-mcp/mcp",
		});

		expect(resolved.tools).toEqual({});
		expect(state.createClientCalls).toBe(1);
		expect(state.closeCalls).toBe(1);

		await resolved.close();
		expect(state.closeCalls).toBe(1);
	});

	test("uses direct fetch when mcpServerUrl is provided", async () => {
		const originalFetch = globalThis.fetch;
		const directFetch = mock(async () => new Response("ok"));
		const bindingFetch = mock(async () => new Response("ok"));
		globalThis.fetch = directFetch as unknown as typeof fetch;

		try {
			await resolveOreAiMcpTools({
				mcpServiceBinding: { fetch: bindingFetch },
				internalSecret: "mcp-secret",
				userId: "user-1",
				requestId: "request-1",
				mcpServerUrl: "http://localhost:8787/mcp",
			});

			expect(state.lastTransportUrl).toBe("http://localhost:8787/mcp");
			const transportFetch = state.lastTransportOptions?.fetch;
			expect(transportFetch).toBeDefined();

			await transportFetch?.(new Request("http://localhost:8787/mcp"));
			expect(directFetch).toHaveBeenCalledTimes(1);
			expect(bindingFetch).toHaveBeenCalledTimes(0);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("uses binding fetch for non-loopback hosts", async () => {
		const originalFetch = globalThis.fetch;
		const directFetch = mock(async () => new Response("ok"));
		const bindingFetch = mock(async () => new Response("ok"));
		globalThis.fetch = directFetch as unknown as typeof fetch;

		try {
			await resolveOreAiMcpTools({
				mcpServiceBinding: { fetch: bindingFetch },
				internalSecret: "mcp-secret",
				userId: "user-1",
				requestId: "request-1",
				mcpServerUrl: "https://ore-ai-mcp/mcp",
			});

			const transportFetch = state.lastTransportOptions?.fetch;
			expect(transportFetch).toBeDefined();
			await transportFetch?.(new Request("https://ore-ai-mcp/mcp"));

			expect(bindingFetch).toHaveBeenCalledTimes(1);
			expect(directFetch).toHaveBeenCalledTimes(0);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("returns empty tools for invalid server URL", async () => {
		const resolved = await resolveOreAiMcpTools({
			mcpServiceBinding: createMcpServiceBinding(),
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			mcpServerUrl: "not-a-url",
		});

		expect(resolved.tools).toEqual({});
		expect(state.createClientCalls).toBe(0);
	});
});
