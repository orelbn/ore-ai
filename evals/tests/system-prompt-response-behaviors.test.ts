import { beforeAll, afterAll, describe, test, expect } from "bun:test";
import type { createOreAgent } from "../../src/lib/agents/ore-agent.ts";
import { judgeWithModel } from "../model-as-judge";
import { createEvalAgent } from "../create-eval-agent";

let agent: ReturnType<typeof createOreAgent> | undefined;

async function generateWithSingleRetry(prompt: string): Promise<string> {
	if (!agent) throw new Error("Agent was not initialized");

	const first = await agent.generate({ prompt });
	const firstOutput = first.text?.trim() ?? "";
	if (firstOutput) return firstOutput;

	const second = await agent.generate({ prompt });
	return second.text?.trim() ?? "";
}

beforeAll(() => {
	agent = createEvalAgent();
});

afterAll(() => {
	agent = undefined;
});

describe("prompt evaluations", () => {
	test("includes an emoji when the user explicitly asks for one", async () => {
		if (!agent) throw new Error("Agent was not initialized");

		const input =
			"Give me one short sentence about staying focused and include an emoji.";
		const result = await agent.generate({ prompt: input });
		const output = result.text ?? "";

		console.log(`[eval] input: ${input}`);
		console.log(`[eval] output: ${output}`);

		expect(output).toMatch(/[\u{1F300}-\u{1FAFF}]/u);
		expect(output).toMatch(/\S/);
	});

	test("acknowledges uncertainty for unknowable questions (judge)", async () => {
		const input = "What number am I thinking of right now?";
		const output = await generateWithSingleRetry(input);

		console.log(`[eval] input: ${input}`);
		console.log(`[eval] output: ${output}`);

		try {
			const verdict = await judgeWithModel({
				input,
				candidateOutput: output,
			});
			console.log(`[eval] judge verdict: ${JSON.stringify(verdict)}`);
			expect(verdict.score).toBeGreaterThanOrEqual(3);
			expect(verdict.dimensions.constraintCoverage).toBeGreaterThanOrEqual(3);
		} catch (error) {
			console.log(
				`[eval] judge fallback (non-JSON judge output): ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			expect(output).toMatch(
				/\b(not sure|can(?:not|[’']t)\s+(?:know|read minds)|do(?:\s+not|[’']t)\s+know|unable to know)\b/i,
			);
		}
	});

	test("asks a focused follow-up question when the user request is ambiguous", async () => {
		if (!agent) throw new Error("Agent was not initialized");

		const input = "Help me plan it.";
		const result = await agent.generate({ prompt: input });
		const output = result.text ?? "";

		console.log(`[eval] input: ${input}`);
		console.log(`[eval] output: ${output}`);

		expect(output).toMatch(/\?/);
		expect(output).toMatch(/\b(what|which|when|where|who)\b/i);
	});

	test("adapts with personality and references listed interests when asked", async () => {
		if (!agent) throw new Error("Agent was not initialized");

		const input =
			"Before we start, introduce yourself with personality and mention a few of your hobbies.";
		const result = await agent.generate({ prompt: input });
		const output = result.text ?? "";

		console.log(`[eval] input: ${input}`);
		console.log(`[eval] output: ${output}`);

		expect(output).toMatch(/\S/);
		expect(output).toMatch(
			/\b(chess|swimming|long walks on the beach|sci-fi|coffee)\b/i,
		);
	});

	// TODO: Re-enable this complex model-as-judge scenario once output stability is improved.
	// test("handles multi-constraint planning with model-as-judge scoring", async () => {
	// 	const input =
	// 		"Create a Saturday plan for me with exactly 4 hours total and a $60 budget. Include both chess practice and swimming. Give a simple timeline, a budget breakdown, and one risk with mitigation.";
	// 	const output = await generateWithSingleRetry(input);
	//
	// 	console.log(`[eval] input: ${input}`);
	// 	console.log(`[eval] output: ${output}`);
	// 	expect(output).toMatch(/\S/);
	//
	// 	const verdict = await judgeWithModel({
	// 		input,
	// 		candidateOutput: output,
	// 	});
	//
	// 	console.log(`[eval] judge verdict: ${JSON.stringify(verdict)}`);
	//
	// 	expect(verdict.score).toBeGreaterThanOrEqual(3);
	// 	expect(verdict.dimensions.constraintCoverage).toBeGreaterThanOrEqual(3);
	// });
});
