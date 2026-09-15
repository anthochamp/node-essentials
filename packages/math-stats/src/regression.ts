import { PreciseSum } from "@ac-kit/core";

import { mean } from "./average.js";

/**
 * Slope of the ordinary-least-squares line through paired `xValues` and
 * `yValues`.
 *
 * @param xValues Independent-variable samples. Not modified.
 * @param yValues Dependent-variable samples paired by index. Not modified.
 * @returns The slope, or `0` for fewer than two values — the same
 *   underdetermined-input convention as {@link sampleVariance}.
 * @throws {RangeError} If `xValues` and `yValues` have different lengths.
 */
export function linearRegressionSlope(
	xValues: readonly number[],
	yValues: readonly number[],
): number {
	if (xValues.length !== yValues.length) {
		throw new RangeError("xValues and yValues must have the same length");
	}

	const count = xValues.length;
	if (count < 2) {
		return 0;
	}

	const meanX = mean(xValues);
	const meanY = mean(yValues);

	// Exact: the deviations straddle their means by construction, so a naive
	// running total can cancel away every significant bit of either accumulator.
	const covariance = new PreciseSum();
	const variance = new PreciseSum();
	for (let index = 0; index < count; index++) {
		const deltaX = xValues[index]! - meanX;
		covariance.add(deltaX * (yValues[index]! - meanY));
		variance.add(deltaX * deltaX);
	}

	const spread = variance.value;

	return spread === 0 ? 0 : covariance.value / spread;
}
