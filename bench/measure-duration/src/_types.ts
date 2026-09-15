import * as z from "zod/mini";

import { harnessOverheadSchema } from "./_harness-overhead.js";
import { contaminationSchema, pooledEstimateSchema } from "./_pool.js";
import { coldStartPhasesSchema } from "./_process-execution.js";
import { durationSamplingReportSchema } from "./_sampling-report.js";
import { spawnBaselineReportSchema } from "./_spawn-baseline.js";
import { durationStatisticsSchema } from "./_statistics-schema.js";
import { durationBenchWarningSchema } from "./_warnings.js";

export type { DurationStatistics } from "./_statistics-schema.js";
export { durationStatisticsSchema };

export const durationBenchRunCaseResultSchema = z.object({
	name: z.string(),
	tags: z.record(z.string(), z.string()),

	/** `null` when the case failed. */
	statistics: z.nullable(durationStatisticsSchema),

	/**
	 * Statistics with the declared fixed overhead removed from every sample, or
	 * `null` when no overhead was declared.
	 */
	adjusted: z.nullable(durationStatisticsSchema),

	/** Declared fixed overhead, in milliseconds. */
	overheadMs: z.number(),

	/** Raw timings in collection order, for export and re-analysis. */
	timings: z.array(z.number()),

	/** How the sampler ran, or `null` when the case never got that far. */
	sampling: z.nullable(durationSamplingReportSchema),

	/** What the measuring apparatus itself cost, or `null` when uncalibrated. */
	harnessOverhead: z.nullable(harnessOverheadSchema),

	/** How one iteration was executed. */
	execution: z.enum(["in-process", "per-iteration-process", "command"]),

	/**
	 * Cost of merely starting the program, for a process-based execution mode.
	 *
	 * `null` for `"in-process"`, and for a command case that declared no
	 * `baselineArgs` — there is no honest way to guess what "this program doing
	 * nothing" means.
	 */
	spawnBaseline: z.nullable(spawnBaselineReportSchema),

	/** Median phase breakdown of a cold start, when the process reported one. */
	coldStart: z.nullable(coldStartPhasesSchema),

	/**
	 * The answer, weighted across every process that measured this case.
	 *
	 * `null` when one process measured it: there is no between-process spread to
	 * estimate, and `statistics` already says everything that was measured.
	 */
	estimate: z.nullable(pooledEstimateSchema),

	/** How much the case's neighbours cost it. `null` unless both arms ran. */
	contamination: z.nullable(contaminationSchema),

	warnings: z.array(durationBenchWarningSchema),

	/** Present when the case threw or crashed. */
	failure: z.optional(z.string()),
});
export type DurationBenchRunCaseResult = z.infer<
	typeof durationBenchRunCaseResultSchema
>;

export const durationBenchRunConditionResultSchema = z.object({
	title: z.string(),
	results: z.array(durationBenchRunCaseResultSchema),
});
export type DurationBenchRunConditionResult = z.infer<
	typeof durationBenchRunConditionResultSchema
>;
