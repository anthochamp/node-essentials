import * as z from "zod/mini";

import { ConstantTimeStatistics } from "./_statistics.js";

/** Below this, cropping has too few samples per class to be meaningful. */
const MIN_SAMPLES_PER_CLASS = 1000;

/** Categories of quality problem detected in a constant-time result. */
export const constantTimeWarningKindSchema = z.enum([
	"leak-detected",
	"too-few-samples",
]);
export type ConstantTimeWarningKind = z.infer<
	typeof constantTimeWarningKindSchema
>;

/** A quality problem that should be shown alongside the numbers. */
export const constantTimeWarningSchema = z.object({
	kind: constantTimeWarningKindSchema,
	message: z.string(),
});
export type ConstantTimeWarning = z.infer<typeof constantTimeWarningSchema>;

/**
 * Surfaces conditions that make a constant-time verdict untrustworthy, or
 * restates a positive verdict as a warning worth calling out alongside the
 * numbers.
 */
export function detectConstantTimeWarnings_(
	statistics: ConstantTimeStatistics,
	leakThreshold: number,
): ConstantTimeWarning[] {
	const warnings: ConstantTimeWarning[] = [];

	if (statistics.samplesPerClass < MIN_SAMPLES_PER_CLASS) {
		warnings.push({
			kind: "too-few-samples",
			message: `only ${statistics.samplesPerClass} samples per class collected; increase samples to raise the harness's power to detect a smaller leak`,
		});
	}

	if (statistics.leakDetected) {
		warnings.push({
			kind: "leak-detected",
			message: `timing difference detected (|t|=${Math.abs(statistics.t).toFixed(2)} > ${leakThreshold}); the two classes are statistically distinguishable`,
		});
	}

	return warnings;
}
