import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

type TestSession = {
	user: {
		id: string;
	};
} | null;

const state = {
	session: { user: { id: "user-1" } } as TestSession,
	redirectTarget: null as string | null,
};

mock.module("@/lib/auth", () => ({
	verifySession: async () => state.session,
	getAuth: async () => ({
		handler: async () => new Response(null, { status: 200 }),
	}),
}));

mock.module("next/navigation", () => ({
	redirect: (target: string) => {
		state.redirectTarget = target;
		throw new Error(`redirect:${target}`);
	},
}));

mock.module("@/components/agent-workspace/agent-workspace", () => ({
	AgentWorkspace() {
		return <main>Ore AI Agent Workspace</main>;
	},
}));

describe("Home page", () => {
	beforeEach(() => {
		state.session = { user: { id: "user-1" } };
		state.redirectTarget = null;
	});

	afterAll(() => {
		mock.restore();
	});

	test("renders for authenticated users", async () => {
		const { default: Home } = await import("./page");
		const element = await Home();
		const html = renderToStaticMarkup(element);

		expect(html).toContain("Ore AI Agent Workspace");
		expect(state.redirectTarget).toBeNull();
	});

	test("redirects unauthenticated users to sign-in", async () => {
		state.session = null;
		const { default: Home } = await import("./page");

		await expect(Home()).rejects.toThrow("redirect:/sign-in");
		expect(state.redirectTarget).toBe("/sign-in");
	});
});
