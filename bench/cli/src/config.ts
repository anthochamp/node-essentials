import type { BenchPlugin } from "@ac-bench/core/plugin";
import { BenchConditionOptions } from "@ac-bench/core/runner";
import { MeasurementPlan } from "@ac-bench/lib";

import { BenchMode } from "./mode.js";

export interface BenchConfig {
	/** Glob patterns for bench files. Default: `["**\/*.bench.ts"]` */
	include?: string[];
	/** Glob patterns to exclude. Default: `["node_modules/**"]` */
	exclude?: string[];
	/**
	 * Ids of the reporters to run, in output order. Default: `["table"]`. Also
	 * settable with `--reporter`.
	 *
	 * `"table"`, `"json"`, `"markdown"` and `"csv"` resolve to the reporters this
	 * CLI ships, with their default options; any other id must name a reporter
	 * plugin listed in `plugins`. Listing a reporter in `plugins` configures it,
	 * it does not select it — that way `--reporter csv` can turn on a reporter
	 * this file has already configured.
	 */
	reporters?: string[];
	/** Default output base name (without extension) for file reporters. */
	output?: string;
	/**
	 * Default sampling options applied to all conditions (overridden per
	 * condition).
	 */
	sampling?: Omit<BenchConditionOptions, "spawnBaselines">;
	/**
	 * Measure and reporter plugins available to this run.
	 *
	 * Import each package directly and list what it exports: a package that takes
	 * options default-exports a factory (`jsonReporter({ output })`), one that
	 * does not default-exports the plugin (`durationPlugin`). The CLI never
	 * imports a measure package itself.
	 */
	plugins?: readonly BenchPlugin[];
	/**
	 * Modules imported inside every child before the bench file, in order.
	 *
	 * `beforeAll`/`afterAll` are condition-scoped and nothing wider exists, so
	 * this is the only per-child setup mechanism. Its cost is paid once per fork
	 * unit rather than once per run — which is what asking for it means when no
	 * state crosses a process boundary.
	 */
	setupFiles?: string[];
	/**
	 * Time without any message from a child before it is considered stuck.
	 * Default 30_000. Reset by every message it sends.
	 */
	heartbeatTimeoutMs?: number;
	/** Wall-clock cap on one fork unit. Default `0`, meaning no cap. */
	conditionTimeoutMs?: number;
	/**
	 * Wall-clock cap on the whole run, retries and cooldown included. Default
	 * `0`, meaning no cap. Also settable with `--max-total-time`.
	 */
	maxTotalTimeMs?: number;
	/**
	 * How much rigour to apply. Default `"standard"`. Also settable with
	 * `--mode`, which is the intended way in.
	 */
	mode?: BenchMode;
	/**
	 * Pins individual measurement-plan parameters, overriding what `mode`
	 * derives.
	 *
	 * For a run that must reproduce an exact plan rather than express an intent —
	 * a published comparison, or a CI job that has to stay comparable with last
	 * month's. Everyone else should use `mode`.
	 */
	measurementPlan?: Partial<MeasurementPlan>;
	/**
	 * Seeds replicate and case ordering. Default: derived from the clock, so each
	 * run randomises differently. Pin it to reproduce a run exactly.
	 */
	orderSeed?: number;
}

/** Returns a typed config object. Use in `bench.config.ts`. */
export function defineConfig(config: BenchConfig): BenchConfig {
	return config;
}
