import { isCloseRelative, PreciseSum } from "@ac-kit/core";

import { chiSquaredDistribution } from "./chi-squared-distribution.js";

/** How many parameters the expected counts were fitted from. */
export type ChiSquaredTestOptions = {
	/**
	 * Parameters estimated from the data itself, each of which costs one degree
	 * of freedom.
	 *
	 * Defaults to 0, which is right when the expected counts come from a
	 * hypothesis stated in advance. Fitting even one parameter and leaving this
	 * at 0 overstates the degrees of freedom and understates the p-value.
	 */
	fittedParameters?: number;
};

/** A chi-squared test's statistic and the evidence against the null. */
export type ChiSquaredTestResult = {
	/** Pearson's `Σ (observed − expected)² / expected`. */
	statistic: number;

	/** `categories − 1 − fittedParameters`. */
	degreesOfFreedom: number;

	/** Probability of a statistic at least this large under the null. */
	pValue: number;
};

/**
 * Pearson's chi-squared test, comparing observed counts against expected ones.
 *
 * The p-value is the chi-squared upper tail computed directly, so a result
 * significant at `1e-30` reports that rather than zero.
 *
 * @param observed Counts actually seen. Not modified.
 * @param expected Counts the null hypothesis predicts, in the same order. Every
 *   one must be positive — a zero expected count makes the statistic undefined,
 *   not infinite.
 * @param options How many parameters were fitted from the data.
 * @returns The statistic, its degrees of freedom and the p-value.
 * @throws {RangeError} When the inputs differ in length, hold fewer than two
 *   categories, contain a non-positive expected count, disagree on the total
 *   count, or leave no degrees of freedom.
 */
export function chiSquaredTest(
	observed: readonly number[],
	expected: readonly number[],
	options?: ChiSquaredTestOptions,
): ChiSquaredTestResult {
	if (observed.length !== expected.length) {
		throw new RangeError(
			"chiSquaredTest: observed and expected must have the same length",
		);
	}
	if (observed.length < 2) {
		throw new RangeError("chiSquaredTest: need at least two categories");
	}

	const degreesOfFreedom =
		observed.length - 1 - (options?.fittedParameters ?? 0);
	if (degreesOfFreedom < 1) {
		throw new RangeError(
			`chiSquaredTest: no degrees of freedom left, got ${degreesOfFreedom}`,
		);
	}

	const total = new PreciseSum();
	const observedTotal = new PreciseSum();
	const expectedTotal = new PreciseSum();

	for (const [index, count] of observed.entries()) {
		const predicted = expected[index]!;
		if (!(predicted > 0)) {
			throw new RangeError(
				`chiSquaredTest: expected counts must be positive, got ${predicted} at index ${index}`,
			);
		}

		observedTotal.add(count);
		expectedTotal.add(predicted);

		const deviation = count - predicted;
		total.add((deviation * deviation) / predicted);
	}

	// A distribution of counts over a different total is not a null hypothesis
	// this statistic measures against — the result would be a number, but not one
	// the chi-squared distribution describes.
	if (!isCloseRelative(observedTotal.value, expectedTotal.value, 1e-8)) {
		throw new RangeError(
			`chiSquaredTest: expected counts must sum to the observed total, got ${expectedTotal.value} against ${observedTotal.value}`,
		);
	}

	const statistic = total.value;

	return {
		statistic,
		degreesOfFreedom,
		pValue: chiSquaredDistribution(degreesOfFreedom).survival(statistic),
	};
}
