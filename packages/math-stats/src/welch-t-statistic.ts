import { mean } from "./average.js";
import { sampleVariance } from "./dispersion.js";

/** Welch's t-test result: the statistic and its degrees of freedom. */
export interface WelchTTestResult {
	/** The t-statistic. Its magnitude is what a caller thresholds on. */
	t: number;

	/** Welch–Satterthwaite degrees of freedom, for reporting alongside `t`. */
	degreesOfFreedom: number;
}

/**
 * Welch's t-statistic for two independent samples, without assuming equal
 * variance.
 *
 * The statistic alone, with no p-value. That is the whole point of it: a caller
 * thresholding on `|t|` — as a dudect-style constant-time check does,
 * conventionally at `4.5` — would pay for an incomplete beta evaluation per
 * call and discard it. Callers wanting the p-value, or the one-sample and
 * paired forms, want `tTest`, which computes this statistic through here.
 *
 * @param a First sample. Not modified.
 * @param b Second sample. Not modified.
 * @returns The t-statistic and its Welch–Satterthwaite degrees of freedom.
 * @throws {RangeError} When either sample has fewer than two values.
 */
export function welchTStatistic(
	a: readonly number[],
	b: readonly number[],
): WelchTTestResult {
	if (a.length < 2 || b.length < 2) {
		throw new RangeError(
			"welchTStatistic: both samples must have at least two values",
		);
	}

	const meanA = mean(a);
	const meanB = mean(b);
	const varianceOverCountA = sampleVariance(a) / a.length;
	const varianceOverCountB = sampleVariance(b) / b.length;
	const standardError = Math.sqrt(varianceOverCountA + varianceOverCountB);

	const t = standardError > 0 ? (meanA - meanB) / standardError : 0;

	const degreesOfFreedom =
		(varianceOverCountA + varianceOverCountB) ** 2 /
		(varianceOverCountA ** 2 / (a.length - 1) +
			varianceOverCountB ** 2 / (b.length - 1));

	return { t, degreesOfFreedom };
}
