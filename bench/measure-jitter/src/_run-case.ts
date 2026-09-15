import { BenchCaseRunContext } from "@ac-bench/core/runner";
import { formatError } from "@ac-kit/core";

import { composeJitterBenchStatistics } from "./_statistics.js";
import { JitterBenchRunCaseResult } from "./_types.js";
import { detectJitterBenchWarnings } from "./_warnings.js";
import { JitterCaseCollectFn } from "./decl.js";
import { JitterCaseOptions, JitterConditionOptions } from "./options.js";

export type RunJitterCaseOptions = JitterCaseOptions & {
	conditionOptions?: JitterConditionOptions;
};

export async function runJitterCase(
	title: string,
	collectFn: JitterCaseCollectFn,
	periodMs: number,
	context: BenchCaseRunContext,
	options?: RunJitterCaseOptions,
): Promise<void> {
	const { signal } = context;
	signal.throwIfAborted();

	const warmup = options?.conditionOptions?.warmup ?? 1;
	const repeats = options?.conditionOptions?.repeats ?? 3;
	const tags = options?.tags ?? {};

	const samples: number[] = [];

	try {
		await options?.setup?.(signal);

		for (let iteration = 0; iteration < warmup; iteration++) {
			signal.throwIfAborted();
			await collectFn(signal);
		}

		for (let iteration = 0; iteration < repeats; iteration++) {
			signal.throwIfAborted();

			for (const sample of await collectFn(signal)) {
				samples.push(sample);
			}
		}
	} catch (error) {
		let failureMessage: string;
		try {
			await options?.teardown?.(context.signal);

			failureMessage = formatError(error);
		} catch (tearDownError) {
			failureMessage = formatError(
				new SuppressedError(
					tearDownError,
					error,
					"teardown failed after case failure",
				),
			);
		}

		context.setCaseResult({
			name: title,
			tags,
			periodMs,
			statistics: null,
			samples: [],
			warnings: [],
			failure: failureMessage,
		} satisfies JitterBenchRunCaseResult);
		return;
	}

	await options?.teardown?.(signal);

	const statistics = composeJitterBenchStatistics(samples, periodMs);
	const warnings = detectJitterBenchWarnings(statistics, periodMs);

	context.setCaseResult({
		name: title,
		tags,
		periodMs,
		statistics,
		samples,
		warnings,
	} satisfies JitterBenchRunCaseResult);
}
