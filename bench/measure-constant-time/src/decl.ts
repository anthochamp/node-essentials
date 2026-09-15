import { registerCondition, registerCase } from "@ac-bench/core/runner";
import { CallableNoArgs, MaybeAsyncCallableNoArgs } from "@ac-kit/core";

import { runConstantTimeCase } from "./_run-case.js";
import {
	ConstantTimeCaseOptions,
	ConstantTimeConditionOptions,
} from "./options.js";

const MEASURE_TYPE_ = "constant-time";

export function constantTimeCondition(
	title: string,
	fn: MaybeAsyncCallableNoArgs,
): void;
export function constantTimeCondition(
	title: string,
	options: ConstantTimeConditionOptions,
	fn: MaybeAsyncCallableNoArgs,
): void;
export function constantTimeCondition(
	title: string,
	optionsOrFn: ConstantTimeConditionOptions | MaybeAsyncCallableNoArgs,
	fn?: MaybeAsyncCallableNoArgs,
): void {
	const [options, callback] =
		typeof optionsOrFn === "function"
			? [undefined, optionsOrFn]
			: [optionsOrFn, fn!];

	registerCondition(MEASURE_TYPE_, title, callback, {
		additionalRunArgs: [options],
	});
}

export function constantTimeCase(
	name: string,
	classA: CallableNoArgs,
	classB: CallableNoArgs,
): void;
export function constantTimeCase(
	name: string,
	options: ConstantTimeCaseOptions,
	classA: CallableNoArgs,
	classB: CallableNoArgs,
): void;
export function constantTimeCase(
	name: string,
	optionsOrClassA: ConstantTimeCaseOptions | CallableNoArgs,
	classAOrClassB: CallableNoArgs | undefined,
	maybeClassB?: CallableNoArgs,
): void {
	const isOptionsForm = typeof optionsOrClassA !== "function";
	const options = isOptionsForm ? optionsOrClassA : undefined;
	const classA = isOptionsForm ? classAOrClassB! : optionsOrClassA;
	const classB = isOptionsForm ? maybeClassB! : classAOrClassB!;

	registerCase<[ConstantTimeConditionOptions | undefined]>(
		MEASURE_TYPE_,
		name,
		(context, conditionOptions) =>
			runConstantTimeCase(name, classA, classB, context, {
				...options,
				conditionOptions,
			}),
	);
}
