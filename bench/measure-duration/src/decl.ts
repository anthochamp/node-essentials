import { registerCase, registerCondition } from "@ac-bench/core/runner";
import { MaybeAsyncCallable, MaybeAsyncCallableNoArgs } from "@ac-kit/core";

import { runDurationCase } from "./_run-case.js";
import { DurationStatistics } from "./_statistics-schema.js";
import {
	DurationCaseOptions,
	DurationCommandCaseOptions,
	DurationConditionOptions,
} from "./options.js";
import { calibrateSpawnOverhead } from "./spawn-overhead.js";

const MEASURE_TYPE_ = "duration" as const;

/** Calibrated once per condition via `onBegin`; `null` until then, or if unused. */
type SpawnOverheadsRef = { current: Map<string, DurationStatistics> | null };

export function durationCondition(
	title: string,
	fn: MaybeAsyncCallableNoArgs,
): void;
export function durationCondition(
	title: string,
	options: DurationConditionOptions,
	fn: MaybeAsyncCallableNoArgs,
): void;
export function durationCondition(
	title: string,
	optionsOrFn: DurationConditionOptions | MaybeAsyncCallableNoArgs,
	fn?: MaybeAsyncCallableNoArgs,
): void {
	const [options, callback] =
		typeof optionsOrFn === "function"
			? [undefined, optionsOrFn]
			: [optionsOrFn, fn!];

	const spawnOverheads: SpawnOverheadsRef = { current: null };

	registerCondition(MEASURE_TYPE_, title, callback, {
		onBegin: async () => {
			if (options?.spawnBaselines && options.spawnBaselines.length > 0) {
				spawnOverheads.current = await calibrateSpawnOverhead(
					options.spawnBaselines,
				);
			}
		},
		additionalRunArgs: [options, spawnOverheads],
	});
}

export type DurationCaseRunFn = MaybeAsyncCallable<[signal: AbortSignal]>;

export function durationCase(title: string, run: DurationCaseRunFn): void;
export function durationCase(
	title: string,
	options: DurationCaseOptions,
	run: DurationCaseRunFn,
): void;
export function durationCase(
	title: string,
	optionsOrRun: DurationCaseOptions | DurationCaseRunFn,
	run?: DurationCaseRunFn,
): void {
	const [options, runFn] =
		typeof optionsOrRun === "function"
			? [undefined, optionsOrRun]
			: [optionsOrRun, run!];

	registerCase<[DurationConditionOptions | undefined, SpawnOverheadsRef]>(
		MEASURE_TYPE_,
		title,
		(context, conditionOptions, spawnOverheads) => {
			const language = options?.tags?.["language"];
			const calibratedOverheadMs =
				language !== undefined
					? spawnOverheads.current?.get(language)?.meanMs
					: undefined;

			return runDurationCase(title, runFn, context, {
				...options,
				conditionOptions,
				overheadMs: options?.overheadMs ?? calibratedOverheadMs,
			});
		},
	);
}

/**
 * Measures an external program. One iteration is one execution of it.
 *
 * The program is started directly, never through a shell: `args` is a vector,
 * so nothing in it is interpreted.
 *
 * @param title Case name.
 * @param command Executable, resolved on `PATH`.
 * @param args Arguments passed to it, unquoted and uninterpreted.
 * @param options Working directory, environment, and the do-nothing arguments
 *   used to measure the program's own start-up.
 */
export function durationCommandCase(
	title: string,
	command: string,
	args: readonly string[],
	options?: DurationCommandCaseOptions,
): void {
	registerCase<[DurationConditionOptions | undefined, SpawnOverheadsRef]>(
		MEASURE_TYPE_,
		title,
		(context, conditionOptions) =>
			runDurationCase(title, () => {}, context, {
				...options,
				conditionOptions,
				commandCase: { command, args, options },
			}),
	);
}
