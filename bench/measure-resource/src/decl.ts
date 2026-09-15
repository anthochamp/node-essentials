import { registerCase, registerCondition } from "@ac-bench/core/runner";
import { MaybeAsyncCallableNoArgs } from "@ac-kit/core";

import { ResourceCaseFn, runResourceCase } from "./_run-case.js";
import { ResourceCaseOptions, ResourceConditionOptions } from "./options.js";

export function resourceCondition(
	title: string,
	fn: MaybeAsyncCallableNoArgs,
): void;
export function resourceCondition(
	title: string,
	options: ResourceConditionOptions,
	fn: MaybeAsyncCallableNoArgs,
): void;
export function resourceCondition(
	title: string,
	optionsOrFn: ResourceConditionOptions | MaybeAsyncCallableNoArgs,
	fn?: MaybeAsyncCallableNoArgs,
): void {
	const [options, callback] =
		typeof optionsOrFn === "function"
			? [undefined, optionsOrFn]
			: [optionsOrFn, fn!];

	registerCondition("resource", title, callback, {
		additionalRunArgs: [options],
	});
}

export function resourceCase(title: string, fn: ResourceCaseFn): void;
export function resourceCase(
	title: string,
	options: ResourceCaseOptions,
	fn: ResourceCaseFn,
): void;
export function resourceCase(
	title: string,
	optionsOrFn: ResourceCaseOptions | ResourceCaseFn,
	fn?: ResourceCaseFn,
): void {
	const isOptionsForm = typeof optionsOrFn !== "function";
	const options = isOptionsForm ? optionsOrFn : undefined;
	const caseFn = isOptionsForm ? fn! : optionsOrFn;

	registerCase<[ResourceConditionOptions | undefined]>(
		"resource",
		title,
		(context, conditionOptions) =>
			runResourceCase(title, caseFn, context, {
				...options,
				conditionOptions,
			}),
	);
}
