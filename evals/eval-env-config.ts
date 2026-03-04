export interface EvalConfig {
	accountId: string;
	apiToken: string;
}

export function resolveEvalConfig(): EvalConfig {
	const accountId = process.env.EVAL_CF_ACCOUNT_ID?.trim();
	const apiToken = process.env.EVAL_CF_API_TOKEN?.trim();

	if (!accountId || !apiToken) {
		throw new Error(
			"Missing eval credentials. Set EVAL_CF_ACCOUNT_ID and EVAL_CF_API_TOKEN.",
		);
	}

	return { accountId, apiToken };
}
