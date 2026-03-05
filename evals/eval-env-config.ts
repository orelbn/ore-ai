export interface EvalConfig {
	googleApiKey: string;
	model?: string;
}

export function resolveEvalConfig(): EvalConfig {
	const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
	const model = process.env.EVAL_MODEL?.trim();

	if (!googleApiKey) {
		throw new Error(
			"Missing eval credentials. Set GOOGLE_GENERATIVE_AI_API_KEY.",
		);
	}

	return {
		googleApiKey,
		model: model || undefined,
	};
}
