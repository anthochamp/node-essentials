import * as z from "zod/mini";

import { ResourceBenchStatistics } from "./_types.js";

/** Share of the heap limit above which a peak is worth flagging. */
const HEAP_PRESSURE_RATIO_ = 0.8;

/** Share of CPU time spent collecting above which the case is GC-bound. */
const GC_BOUND_RATIO_ = 0.25;

/** Below this many bytes per operation, allocation is below what GC resolves. */
const ALLOCATION_RESOLUTION_BYTES_ = 8;

export const resourceBenchWarningKindSchema = z.enum([
	"no-forced-collection",
	"heap-pressure",
	"gc-bound",
	"below-resolution",
	"too-few-samples",
]);
export type ResourceBenchWarningKind = z.infer<
	typeof resourceBenchWarningKindSchema
>;

export const resourceBenchWarningSchema = z.object({
	kind: resourceBenchWarningKindSchema,
	message: z.string(),
});
export type ResourceBenchWarning = z.infer<typeof resourceBenchWarningSchema>;

export function detectResourceBenchWarnings(
	statistics: ResourceBenchStatistics,
	forcedCollection: boolean,
): ResourceBenchWarning[] {
	const warnings: ResourceBenchWarning[] = [];

	if (!forcedCollection) {
		warnings.push({
			kind: "no-forced-collection",
			message:
				"run without --expose-gc: allocation includes whatever the collector had not yet reclaimed, so compare cases within this run only",
		});
	}

	if (statistics.samples < 5) {
		warnings.push({
			kind: "too-few-samples",
			message: `only ${statistics.samples} batches; the allocation figure has not been shown to settle`,
		});
	}

	if (statistics.heapLimitRatio >= HEAP_PRESSURE_RATIO_) {
		warnings.push({
			kind: "heap-pressure",
			message: `peak heap reached ${(statistics.heapLimitRatio * 100).toFixed(0)}% of the limit; the collector was working against the case and the timing reflects that`,
		});
	}

	if (
		statistics.gcTimeRatio !== null &&
		statistics.gcTimeRatio >= GC_BOUND_RATIO_
	) {
		warnings.push({
			kind: "gc-bound",
			message: `${(statistics.gcTimeRatio * 100).toFixed(0)}% of CPU time was spent collecting; this case is bound by what it allocates, not by what it computes`,
		});
	}

	if (statistics.allocatedBytes < ALLOCATION_RESOLUTION_BYTES_) {
		warnings.push({
			kind: "below-resolution",
			message:
				"allocation per operation is at the limit of what the heap counters resolve; treat as zero",
		});
	}

	return warnings;
}
