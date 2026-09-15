import * as z from "zod/mini";

import { resourceBenchWarningSchema } from "./_warnings.js";

/**
 * One batch's cost, already divided by the operations it ran, so every sample
 * is directly comparable regardless of how the sampler sized its batches.
 */
export const resourceBenchSampleSchema = z.object({
	operations: z.number(),
	cpuTimeMs: z.number(),
	allocatedBytes: z.number(),
	heapPeakBytes: z.number(),
	rssBytes: z.number(),
	/** `null` where the runtime does not report collections. */
	gcCount: z.nullable(z.number()),
	gcPauseMs: z.nullable(z.number()),
});
export type ResourceBenchSample = z.infer<typeof resourceBenchSampleSchema>;

const resourceBenchStatisticsSchema = z.object({
	samples: z.number(),
	operations: z.number(),

	/** Medians, per operation, except the peaks which are maxima over the run. */
	cpuTimeMs: z.number(),
	allocatedBytes: z.number(),
	/** `null` where the runtime does not report collections. */
	gcPauseMs: z.nullable(z.number()),
	gcCount: z.nullable(z.number()),

	heapPeakBytes: z.number(),
	rssPeakBytes: z.number(),

	/** Share of the heap limit the peak reached, in [0, 1]. */
	heapLimitRatio: z.number(),

	/** Fraction of the CPU time spent collecting, in [0, 1], or `null`. */
	gcTimeRatio: z.nullable(z.number()),
});
export type ResourceBenchStatistics = z.infer<
	typeof resourceBenchStatisticsSchema
>;

export const resourceBenchRunCaseResultSchema = z.object({
	name: z.string(),
	tags: z.record(z.string(), z.string()),

	/** `null` when the case failed. */
	statistics: z.nullable(resourceBenchStatisticsSchema),

	/** Whether `--expose-gc` was available, so the numbers can be read fairly. */
	forcedCollection: z.boolean(),

	warnings: z.array(resourceBenchWarningSchema),

	/** Present when the case threw. */
	failure: z.optional(z.string()),
});
export type ResourceBenchRunCaseResult = z.infer<
	typeof resourceBenchRunCaseResultSchema
>;

export const resourceBenchRunConditionResultSchema = z.object({
	title: z.string(),
	results: z.array(resourceBenchRunCaseResultSchema),
});
export type ResourceBenchRunConditionResult = z.infer<
	typeof resourceBenchRunConditionResultSchema
>;
