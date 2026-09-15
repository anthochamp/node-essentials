import { CaseCommonOptions } from "@ac-bench/core/runner";

import { DurationSampling } from "./_sampling-options.js";
import { SpawnBaseline } from "./spawn-overhead.js";

export type DurationConditionOptions = {
	sampling?: Partial<DurationSampling>;

	/**
	 * Reference commands to calibrate once, before any case runs, and match
	 * against a case's `tags.language` to set its
	 * {@link DurationCaseOptions.overheadMs} automatically. A case that already
	 * declares `overheadMs` is left alone.
	 */
	spawnBaselines?: readonly SpawnBaseline[];
};

export type DurationExecution =
	/** Default. One iteration is one call in the measuring process. */
	| "in-process"
	/**
	 * One iteration is one fresh process. Measures cold start — module load, JIT
	 * warm-up, first-call cost — which is exactly what `"in-process"`
	 * deliberately warms away.
	 *
	 * The enclosing conditions' `beforeEach`/`afterEach` still run in the
	 * measuring process; the case's own `setup`/`teardown` run inside each
	 * spawned process, and so are part of the sample.
	 */
	| "per-iteration-process";

export type DurationCaseOptions = CaseCommonOptions & {
	/** Defaults to `"in-process"`. */
	execution?: DurationExecution;

	/**
	 * Fixed overhead in milliseconds subtracted from each timing.
	 *
	 * Mutually exclusive with a measured spawn baseline: declaring both is a
	 * validation error rather than a silent double subtraction.
	 */
	overheadMs?: number;

	/**
	 * Measure what starting the program costs and report it beside the result.
	 *
	 * Defaults to `true` whenever a spawn baseline applies at all. The baseline
	 * is never folded into the primary statistics; it drives the `adjusted`
	 * figure, the same way a declared `overheadMs` does.
	 */
	subtractSpawnBaseline?: boolean;
};

export type DurationCommandCaseOptions = Omit<
	DurationCaseOptions,
	"execution"
> & {
	cwd?: string;
	env?: Readonly<Record<string, string>>;

	/**
	 * Arguments that make the program do nothing, used to measure its own
	 * start-up baseline.
	 *
	 * Without them the baseline would have to be guessed from an unrelated
	 * interpreter, so a command case that omits them emits a `no-baseline-args`
	 * warning rather than silently reporting start-up time as work.
	 */
	baselineArgs?: readonly string[];
};
