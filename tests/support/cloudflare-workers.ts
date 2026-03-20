export const env = {
	DB: {} as D1Database,
	BETTER_AUTH_SECRET: "test-better-auth-secret",
	BETTER_AUTH_URL: "https://example.test",
	TURNSTILE_SITE_KEY: "test-site-key",
	TURNSTILE_SECRET_KEY: "test-turnstile-secret",
	MCP_SERVER_URL: "https://example.com/mcp",
	MCP_INTERNAL_SHARED_SECRET: "test-mcp-secret",
	ORE_AI_MCP: {
		fetch: async () => new Response("ok"),
	},
	AGENT_PROMPTS: {
		get: async () => null,
	},
};
