import * as z from "zod/mini";

import { jitterBenchWarningSchema } from "./_warnings.js";

const jitterBenchStatisticsSchema = z.object({
	samples: z.number(),
	meanMs: z.number(),
	medianMs: z.number(),
	minMs: z.number(),
	maxMs: z.number(),
	meanAbsoluteMs: z.number(),
	p90Ms: z.number(),
	p99Ms: z.number(),
	driftMsPerSecond: z.number(),
	overruns: z.number(),
});

export const jitterBenchRunCaseResultSchema = z.object({
	name: z.string(),
	tags: z.record(z.string(), z.string()),
	periodMs: z.number(),

	/** `null` when the case failed. */
	statistics: z.nullable(jitterBenchStatisticsSchema),

	/** Every lateness sample, in firing order, for export and re-analysis. */
	samples: z.array(z.number()),

	warnings: z.array(jitterBenchWarningSchema),

	/** Present when the case threw. */
	failure: z.optional(z.string()),
});
export type JitterBenchRunCaseResult = z.infer<
	typeof jitterBenchRunCaseResultSchema
>;

export const jitterBenchRunConditionResultSchema = z.object({
	title: z.string(),
	results: z.array(jitterBenchRunCaseResultSchema),
});
export type JitterBenchRunConditionResult = z.infer<
	typeof jitterBenchRunConditionResultSchema
>;
