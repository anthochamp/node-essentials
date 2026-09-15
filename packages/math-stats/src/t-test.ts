import { mean } from "./average.js";
import { sampleVariance } from "./dispersion.js";
import { studentTDistribution } from "./student-t-distribution.js";
import { welchTStatistic } from "./welch-t-statistic.js";

/** Which departure from the null hypothesis the p-value is computed against. */
export type TTestAlternative = "two-sided" | "less" | "greater";

/** How the samples relate, and what the p-value is measured against. */
export type TTestOptions = {
	/**
	 * Treat the two samples as matched by index and test their differences.
	 * Ignored when the second argument is a hypothesised mean rather than a
	 * sample.
	 */
	paired?: boolean;

	/**
	 * Pool the two variances into one (Student's original form) instead of
	 * letting them differ (Welch's).
	 *
	 * Defaults to `false`, and should usually stay there: pooling is only valid
	 * when the variances really are equal, and Welch's form costs almost nothing
	 * when they are.
	 */
	pooled?: boolean;

	/** Defaults to `"two-sided"`. */
	alternative?: TTestAlternative;
};

/** A t-test's statistic and the evidence against the null hypothesis. */
export type TTestResult = {
	/** The t-statistic. */
	statistic: number;

	/** Degrees of freedom of the reference distribution. */
	degreesOfFreedom: number;

	/** Probability of a statistic at least this extreme under the null. */
	pValue: number;
};

/**
 * Student's t-test, in whichever of its three forms the arguments describe.
 *
 * Passing a number as `other` runs the one-sample test against it as a
 * hypothesised mean; passing a second sample runs the two-sample test, or the
 * paired test with `options.paired`. The form is read off the arguments rather
 * than named by an option, because an option could contradict them.
 *
 * The p-value comes from the tail of the t distribution computed directly, not
 * from `1 − cdf`, so a result significant at `1e-17` reports that rather than
 * zero.
 *
 * @param sample The sample. Not modified.
 * @param other A second sample, or the hypothesised mean to test against.
 * @param options How the samples relate and which alternative to test.
 * @returns The statistic, its degrees of freedom and the p-value.
 * @throws {RangeError} When a sample is too small, or a paired test is given
 *   samples of different lengths.
 */
export function tTest(
	sample: readonly number[],
	other: readonly number[] | number,
	options?: TTestOptions,
): TTestResult {
	const alternative = options?.alternative ?? "two-sided";

	const { statistic, degreesOfFreedom } =
		typeof other === "number"
			? oneSample_(sample, other)
			: options?.paired
				? oneSample_(differences_(sample, other), 0)
				: options?.pooled
					? pooled_(sample, other)
					: welch_(sample, other);

	const reference = studentTDistribution(degreesOfFreedom);
	const pValue =
		alternative === "two-sided"
			? 2 * reference.survival(Math.abs(statistic))
			: alternative === "greater"
				? reference.survival(statistic)
				: reference.cdf(statistic);

	return { statistic, degreesOfFreedom, pValue };
}

/**
 * Welch's statistic, renamed into this module's field names. `welchTStatistic`
 * keeps `t` because its own callers threshold on it directly.
 */
function welch_(
	a: readonly number[],
	b: readonly number[],
): { statistic: number; degreesOfFreedom: number } {
	const { t, degreesOfFreedom } = welchTStatistic(a, b);

	return { statistic: t, degreesOfFreedom };
}

/** The one-sample statistic, which the paired form also reduces to. */
function oneSample_(
	sample: readonly number[],
	hypothesised: number,
): { statistic: number; degreesOfFreedom: number } {
	if (sample.length < 2) {
		throw new RangeError("tTest: the sample must have at least two values");
	}

	const standardError = Math.sqrt(sampleVariance(sample) / sample.length);

	return {
		statistic:
			standardError > 0 ? (mean(sample) - hypothesised) / standardError : 0,
		degreesOfFreedom: sample.length - 1,
	};
}

/** Student's original equal-variance statistic, with the variances pooled. */
function pooled_(
	a: readonly number[],
	b: readonly number[],
): { statistic: number; degreesOfFreedom: number } {
	if (a.length < 2 || b.length < 2) {
		throw new RangeError("tTest: both samples must have at least two values");
	}

	const degreesOfFreedom = a.length + b.length - 2;
	const variance =
		((a.length - 1) * sampleVariance(a) + (b.length - 1) * sampleVariance(b)) /
		degreesOfFreedom;
	const standardError = Math.sqrt(variance * (1 / a.length + 1 / b.length));

	return {
		statistic: standardError > 0 ? (mean(a) - mean(b)) / standardError : 0,
		degreesOfFreedom,
	};
}

/** Element-wise differences, which the paired test treats as one sample. */
function differences_(a: readonly number[], b: readonly number[]): number[] {
	if (a.length !== b.length) {
		throw new RangeError(
			"tTest: a paired test needs samples of the same length",
		);
	}

	return a.map((value, index) => value - b[index]!);
}
