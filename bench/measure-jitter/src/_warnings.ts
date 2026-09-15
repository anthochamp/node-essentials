import * as z from "zod/mini";

import { JitterBenchStatistics } from "./_statistics.js";

/** Drift above which the implementation is accumulating error, in ms per second. */
const DRIFT_THRESHOLD_ = 0.5;

/** Below this, lateness is indistinguishable from clock and loop granularity. */
const RESOLUTION_MS_ = 0.05;

/** Categories of quality problem detected in a latency result. */
export const jitterBenchWarningKindSchema = z.enum([
	"drift",
	"overruns",
	"below-resolution",
	"too-few-samples",
]);
export type JitterBenchWarningKind = z.infer<
	typeof jitterBenchWarningKindSchema
>;

/** A quality problem that should be shown alongside the numbers. */
export const jitterBenchWarningSchema = z.object({
	kind: jitterBenchWarningKindSchema,
	message: z.string(),
});
export type JitterBenchWarning = z.infer<typeof jitterBenchWarningSchema>;

export function detectJitterBenchWarnings(
	statistics: JitterBenchStatistics,
	periodMs: number,
): JitterBenchWarning[] {
	const warnings: JitterBenchWarning[] = [];

	if (statistics.samples < 30) {
		warnings.push({
			kind: "too-few-samples",
			message: `only ${statistics.samples} firings; tail percentiles are not meaningful`,
		});
	}

	if (Math.abs(statistics.driftMsPerSecond) >= DRIFT_THRESHOLD_) {
		warnings.push({
			kind: "drift",
			message: `lateness grows by ${statistics.driftMsPerSecond.toFixed(2)} ms per second elapsed; the next deadline is computed from the last firing rather than from a fixed origin`,
		});
	}

	if (statistics.overruns > 0) {
		warnings.push({
			kind: "overruns",
			message: `${statistics.overruns} firings were a full period (${periodMs} ms) late or worse`,
		});
	}

	if (
		Math.abs(statistics.medianMs) < RESOLUTION_MS_ &&
		statistics.p99Ms < RESOLUTION_MS_
	) {
		warnings.push({
			kind: "below-resolution",
			message:
				"lateness is at the limit of what the clock and the event loop can resolve; treat as zero",
		});
	}

	return warnings;
}
