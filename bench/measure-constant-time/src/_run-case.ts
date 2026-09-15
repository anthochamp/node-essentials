import { hrtime } from "node:process";

import { BenchCaseRunContext } from "@ac-bench/core/runner";
import { CallableNoArgs, formatError } from "@ac-kit/core";
import { mulberry32 } from "@ac-kit/math-random";

import {
	DEFAULT_LEAK_THRESHOLD,
	DEFAULT_SEED,
	runDudectCheck,
} from "./_dudect.js";
import { ConstantTimeCaseResult } from "./_types.js";
import { detectConstantTimeWarnings_ } from "./_warnings.js";
import {
	ConstantTimeCaseOptions,
	ConstantTimeConditionOptions,
} from "./options.js";

export type ConstantTimeRunCaseOptions = ConstantTimeCaseOptions & {
	conditionOptions?: ConstantTimeConditionOptions;
};

/**
 * Run one constant-time check.
 *
 * @param title Case name, carried into the reported result.
 * @param classA First closure to time.
 * @param classB Second closure to time.
 * @param context Run context, used to report the result and check for abort.
 * @param options Sampling, cropping and threshold policy.
 */
export async function runConstantTimeCase(
	title: string,
	classA: CallableNoArgs,
	classB: CallableNoArgs,
	context: BenchCaseRunContext,
	options?: ConstantTimeRunCaseOptions,
): Promise<void> {
	context.signal.throwIfAborted();

	const tags = options?.tags ?? {};
	const leakThreshold =
		options?.conditionOptions?.dudect?.leakThreshold ?? DEFAULT_LEAK_THRESHOLD;

	const beforeMeasure = options?.beforeEach
		? () => options.beforeEach?.(context.signal)
		: undefined;
	const afterMeasure = options?.afterEach
		? () => options.afterEach?.(context.signal)
		: undefined;

	try {
		await options?.setup?.(context.signal);

		const dudectResult = await runDudectCheck(classA, classB, {
			...options?.conditionOptions?.dudect,
			random:
				options?.conditionOptions?.dudect?.random ?? mulberry32(DEFAULT_SEED),
			now: hrtime.bigint,
			signal: context.signal,
			beforeMeasure,
			afterMeasure,
		});

		await options?.teardown?.(context.signal);

		context.setCaseResult({
			title,
			tags,
			dudectResult,
			warnings: detectConstantTimeWarnings_(dudectResult, leakThreshold),
			failureMessage: null,
		} satisfies ConstantTimeCaseResult);
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
			title,
			tags,
			dudectResult: null,
			warnings: [],
			failureMessage,
		} satisfies ConstantTimeCaseResult);
	}
}
