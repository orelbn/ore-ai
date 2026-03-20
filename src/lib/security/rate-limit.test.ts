import { beforeAll, describe, expect, test, vi } from "vitest";

let applyAnonymousRateLimit: typeof import("./rate-limit").applyAnonymousRateLimit;
let consumeRateLimitCounters: typeof import("@/services/cloudflare/rate-limiter-do").consumeRateLimitCounters;

vi.mock("cloudflare:workers", () => ({
	DurableObject: class {
		protected readonly ctx: unknown;
		protected readonly env: unknown;

		constructor(ctx: unknown, env: unknown) {
			this.ctx = ctx;
			this.env = env;
		}
	},
}));

beforeAll(async () => {
	({ applyAnonymousRateLimit } = await import("./rate-limit"));
	({ consumeRateLimitCounters } = await import(
		"@/services/cloudflare/rate-limiter-do"
	));
});

type TestRateLimitTransaction = {
	get<T>(key: string): Promise<T | undefined>;
	put<T>(key: string, value: T): Promise<void>;
};

class InMemoryRateLimitStorage {
	private readonly records = new Map<string, unknown>();
	shouldThrow = false;

	async transaction<T>(
		closure: (txn: TestRateLimitTransaction) => Promise<T>,
	): Promise<T> {
		if (this.shouldThrow) {
			throw new Error("storage failed");
		}

		return closure({
			get: async <TValue>(key: string) => {
				const value = this.records.get(key);
				return value === undefined ? undefined : (value as TValue);
			},
			put: async <TValue>(key: string, value: TValue) => {
				this.records.set(key, value);
			},
		} satisfies TestRateLimitTransaction);
	}
}

function createLimiterEnv(storage = new InMemoryRateLimitStorage()) {
	return {
		storage,
		env: {
			BETTER_AUTH_SECRET: "better-auth-secret",
			RATE_LIMITER: {
				getByName: () => ({
					fetch: async (_url: string, init?: RequestInit) => {
						const payload = JSON.parse(String(init?.body));
						if (
							typeof payload !== "object" ||
							payload === null ||
							!("bucket" in payload) ||
							typeof payload.bucket !== "string" ||
							!("principal" in payload) ||
							typeof payload.principal !== "string" ||
							!("policies" in payload) ||
							!Array.isArray(payload.policies)
						) {
							throw new Error("Invalid rate-limit payload");
						}
						const result = await consumeRateLimitCounters({
							storage,
							bucket: payload.bucket,
							principal: payload.principal,
							policies: payload.policies,
							nowMs: payload.nowMs ?? Date.now(),
						});
						return Response.json(result);
					},
				}),
			},
		},
	};
}

function createRequest() {
	return new Request("http://localhost/api/chat", {
		method: "POST",
		headers: {
			"cf-connecting-ip": "198.51.100.10",
		},
	});
}

describe("applyAnonymousRateLimit", () => {
	test("allows requests under limit", async () => {
		const { env } = createLimiterEnv();

		const response = await applyAnonymousRateLimit({
			env,
			request: createRequest(),
			scope: "chat",
			nowMs: 10_000,
		});

		expect(response).toBeNull();
	});

	test("blocks requests over limit", async () => {
		const { env } = createLimiterEnv();

		for (let attempt = 0; attempt < 12; attempt += 1) {
			await expect(
				applyAnonymousRateLimit({
					env,
					request: createRequest(),
					scope: "chat",
					nowMs: 10_000,
				}),
			).resolves.toBeNull();
		}

		const response = await applyAnonymousRateLimit({
			env,
			request: createRequest(),
			scope: "chat",
			nowMs: 10_000,
		});

		expect(response?.status).toBe(429);
		await expect(response?.json()).resolves.toEqual({
			error: "Too many requests. Please try again later.",
			retryAfterSeconds: 50,
		});
		expect(response?.headers.get("Retry-After")).toBe("50");
	});

	test("keeps chat and verification buckets separate", async () => {
		const { env } = createLimiterEnv();

		for (let attempt = 0; attempt < 12; attempt += 1) {
			await applyAnonymousRateLimit({
				env,
				request: createRequest(),
				scope: "chat",
				nowMs: 10_000,
			});
		}

		const response = await applyAnonymousRateLimit({
			env,
			request: createRequest(),
			scope: "session_verify",
			nowMs: 10_000,
		});

		expect(response).toBeNull();
	});

	test("returns the longest active retry window when multiple limits are exhausted", async () => {
		const { env } = createLimiterEnv();

		for (let attempt = 0; attempt < 60; attempt += 1) {
			await applyAnonymousRateLimit({
				env,
				request: createRequest(),
				scope: "chat",
				nowMs: 1_790_000,
			});
		}

		const response = await applyAnonymousRateLimit({
			env,
			request: createRequest(),
			scope: "chat",
			nowMs: 1_790_000,
		});

		expect(response?.status).toBe(429);
		await expect(response?.json()).resolves.toEqual({
			error: "Too many requests. Please try again later.",
			retryAfterSeconds: 10,
		});
	});

	test("fails closed when limiter storage errors", async () => {
		const { env, storage } = createLimiterEnv();
		storage.shouldThrow = true;

		const response = await applyAnonymousRateLimit({
			env,
			request: createRequest(),
			scope: "chat",
			nowMs: 10_000,
		});

		expect(response?.status).toBe(503);
		await expect(response?.json()).resolves.toEqual({
			error: "Service temporarily unavailable.",
		});
	});

	test("fails closed when the limiter binding is missing", async () => {
		const response = await applyAnonymousRateLimit({
			env: {
				BETTER_AUTH_SECRET: "better-auth-secret",
			},
			request: createRequest(),
			scope: "chat",
			nowMs: 10_000,
		});

		expect(response?.status).toBe(503);
		await expect(response?.json()).resolves.toEqual({
			error: "Service temporarily unavailable.",
		});
	});
});
