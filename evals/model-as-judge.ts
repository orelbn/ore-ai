import { createOreAgent } from "../src/lib/agents/ore-agent.ts";
import { createCloudflareAiBinding } from "./cloudflare-workers-ai-binding";
import { resolveEvalConfig } from "./eval-env-config";

export interface JudgeVerdict {
	pass: boolean;
	score: number;
	dimensions: {
		constraintCoverage: number;
		structureClarity: number;
		actionability: number;
	};
	feedback: string;
}

const JUDGE_SYSTEM_PROMPT = `You are a strict evaluation judge.
Evaluate a candidate assistant response against the rubric provided by the user.
Output ONLY valid JSON with this exact shape:
{"pass":boolean,"score":number,"dimensions":{"constraintCoverage":number,"structureClarity":number,"actionability":number},"feedback":string}
Rules:
- Scores are integers from 1 to 5.
- "score" is the average of the three dimension scores rounded to nearest integer.
- pass=true only if all dimensions are >= 3 and score >= 4.
- Keep feedback to one short sentence.
- Do not output markdown or any extra text.`;

function extractJsonObject(text: string): string {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) {
		throw new Error(`Judge did not return JSON: ${text}`);
	}
	return text.slice(start, end + 1);
}

function isValidScore(value: unknown): value is number {
	return (
		Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5
	);
}

function validateVerdict(raw: unknown): JudgeVerdict {
	if (!raw || typeof raw !== "object") {
		throw new Error("Invalid judge verdict: expected object");
	}

	const verdict = raw as Partial<JudgeVerdict>;
	const dims = verdict.dimensions as JudgeVerdict["dimensions"] | undefined;

	if (typeof verdict.pass !== "boolean") {
		throw new Error("Invalid judge verdict: pass must be boolean");
	}
	if (!isValidScore(verdict.score)) {
		throw new Error("Invalid judge verdict: score must be integer 1-5");
	}
	if (!dims) {
		throw new Error("Invalid judge verdict: dimensions missing");
	}
	if (
		!isValidScore(dims.constraintCoverage) ||
		!isValidScore(dims.structureClarity) ||
		!isValidScore(dims.actionability)
	) {
		throw new Error(
			"Invalid judge verdict: dimension scores must be integers 1-5",
		);
	}
	if (typeof verdict.feedback !== "string" || !verdict.feedback.trim()) {
		throw new Error("Invalid judge verdict: feedback must be non-empty string");
	}

	return {
		pass: verdict.pass,
		score: verdict.score,
		dimensions: dims,
		feedback: verdict.feedback.trim(),
	};
}

export async function judgeWithModel(params: {
	input: string;
	candidateOutput: string;
}): Promise<JudgeVerdict> {
	const config = resolveEvalConfig();
	const binding = createCloudflareAiBinding(config);
	const judgeAgent = createOreAgent(binding, {}, JUDGE_SYSTEM_PROMPT);

	const judgePrompt = `User request:
${params.input}

Candidate response:
${params.candidateOutput}

Rubric:
1) constraintCoverage: Did it satisfy explicit constraints from the user request?
2) structureClarity: Is the response clearly structured and easy to follow?
3) actionability: Are steps concrete and directly usable?

Return only the JSON object.`;

	const result = await judgeAgent.generate({ prompt: judgePrompt });
	const rawText = result.text ?? "";
	const parsed = JSON.parse(extractJsonObject(rawText));
	return validateVerdict(parsed);
}
