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

const state = {
	calls: [] as Array<{
		requestId: string;
		servers: Array<{
			serverName: string;
			serverUrl: string;
			serviceBinding?: Fetcher;
			requestHeaders?: Record<string, string>;
		}>;
	}>,
	resolvedTools: {
		"ore.alpha": { execute: async () => ({ ok: true }) },
	} as ToolSet,
	closeCalls: 0,
};

function resetState() {
	state.calls = [];
	state.resolvedTools = {
		"ore.alpha": { execute: async () => ({ ok: true }) },
	};
	state.closeCalls = 0;
}

mock.module("../mcp/tooling", () => ({
	resolveMcpToolsFromServers: async (input: {
		requestId: string;
		servers: Array<{
			serverName: string;
			serverUrl: string;
			serviceBinding?: Fetcher;
			requestHeaders?: Record<string, string>;
		}>;
	}) => {
		state.calls.push(input);
		return {
			tools: state.resolvedTools,
			close: async () => {
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

describe("resolveOreAiMcpTools", () => {
	test("forwards server config and request headers", async () => {
		const binding = { fetch: async () => new Response("ok") } as Fetcher;
		const resolved = await resolveOreAiMcpTools({
			mcpServiceBinding: binding,
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-1",
			mcpServerUrl: "https://ore-ai-mcp/mcp",
		});

		expect(state.calls).toHaveLength(1);
		expect(state.calls[0]).toEqual({
			requestId: "request-1",
			servers: [
				{
					serverName: "ore_ai_mcp",
					serverUrl: "https://ore-ai-mcp/mcp",
					serviceBinding: binding,
					requestHeaders: {
						"x-ore-internal-secret": "mcp-secret",
						"x-ore-user-id": "user-1",
						"x-ore-request-id": "request-1",
					},
				},
			],
		});

		expect(Object.keys(resolved.tools)).toEqual(["ore.alpha"]);
		await resolved.close();
		expect(state.closeCalls).toBe(1);
	});

	test("returns the tools object from resolver", async () => {
		state.resolvedTools = {
			"ore.alpha": { execute: async () => ({ ok: true }) },
			"ore.beta": { execute: async () => ({ ok: true }) },
		};

		const resolved = await resolveOreAiMcpTools({
			mcpServiceBinding: { fetch: async () => new Response("ok") } as Fetcher,
			internalSecret: "mcp-secret",
			userId: "user-1",
			requestId: "request-2",
			mcpServerUrl: "https://ore-ai-mcp/mcp",
		});

		expect(Object.keys(resolved.tools).sort()).toEqual([
			"ore.alpha",
			"ore.beta",
		]);
	});
});
