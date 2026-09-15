import { IntervalHistogram, monitorEventLoopDelay } from "perf_hooks";

import { registerCondition, registerCase } from "@ac-bench/core/runner";
import { MaybeAsyncCallable, MaybeAsyncCallableNoArgs } from "@ac-kit/core";

import { runJitterCase } from "./_run-case.js";
import { JitterCaseOptions, JitterConditionOptions } from "./options.js";

export function jitterCondition(
	title: string,
	fn: MaybeAsyncCallableNoArgs,
): void;
export function jitterCondition(
	title: string,
	options: JitterConditionOptions,
	fn: MaybeAsyncCallableNoArgs,
): void;
export function jitterCondition(
	title: string,
	optionsOrFn: JitterConditionOptions | MaybeAsyncCallableNoArgs,
	fn?: MaybeAsyncCallableNoArgs,
): void {
	const [options, callback] =
		typeof optionsOrFn === "function"
			? [undefined, optionsOrFn]
			: [optionsOrFn, fn!];

	let loopDelay: IntervalHistogram;

	registerCondition("jitter", title, callback, {
		onBegin: () => {
			loopDelay = monitorEventLoopDelay({ resolution: 1 });
			loopDelay.enable();
		},
		onEnd: () => {
			loopDelay.disable();
		},
		additionalRunArgs: [options],
	});
}

export type JitterCaseCollectFn = MaybeAsyncCallable<
	[signal: AbortSignal],
	readonly number[]
>;

export function jitterCase(
	title: string,
	periodMs: number,
	collect: JitterCaseCollectFn,
): void;
export function jitterCase(
	title: string,
	periodMs: number,
	options: JitterCaseOptions,
	collect: JitterCaseCollectFn,
): void;
export function jitterCase(
	title: string,
	periodMs: number,
	optionsOrCollect: JitterCaseOptions | JitterCaseCollectFn,
	collect?: JitterCaseCollectFn,
): void {
	const isOptionsForm = typeof optionsOrCollect !== "function";
	const options = isOptionsForm ? optionsOrCollect : undefined;
	const collectFn = isOptionsForm ? collect! : optionsOrCollect;

	registerCase<[JitterConditionOptions | undefined]>(
		"jitter",
		title,
		(context, conditionOptions) =>
			runJitterCase(title, collectFn, periodMs, context, {
				...options,
				conditionOptions,
			}),
	);
}
