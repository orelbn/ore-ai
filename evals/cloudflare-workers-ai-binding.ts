import type { EvalConfig } from "./eval-env-config";

export function createCloudflareAiBinding(config: EvalConfig): Ai {
	return {
		async run(
			model: string,
			inputs: unknown,
			options?: { signal?: AbortSignal },
		) {
			const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${model}`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${config.apiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(inputs),
				signal: options?.signal,
			});

			if (!response.ok) {
				const body = await response.text().catch(() => "<unable to read body>");
				throw new Error(`Workers AI API error (${response.status}): ${body}`);
			}

			const payload = (await response.json()) as { result?: unknown };
			return payload.result;
		},
	} as Ai;
}
