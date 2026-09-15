/** A ratio between two measurements, with its propagated uncertainty. */
export interface RatioWithUncertainty {
	/** `value / baseline`. */
	ratio: number;

	/** Absolute margin on {@link RatioWithUncertainty.ratio}. */
	errorMargin: number;
}

/**
 * Ratio of two independently-measured quantities, with the uncertainty
 * propagated from each operand's own relative uncertainty.
 *
 * Reporting a ratio without an error term invites reading noise as signal: the
 * relative uncertainty of a quotient of two independent quantities is the
 * quadrature sum (root sum of squares) of their own relative uncertainties.
 *
 * @param value Numerator.
 * @param relativeUncertaintyValue `value`'s dispersion as a fraction of `value`
 *   (e.g. a relative standard deviation).
 * @param baseline Denominator.
 * @param relativeUncertaintyBaseline `baseline`'s dispersion as a fraction of
 *   `baseline`.
 * @returns `NaN` for both fields when `baseline` is `0`.
 */
export function ratioWithUncertainty(
	value: number,
	relativeUncertaintyValue: number,
	baseline: number,
	relativeUncertaintyBaseline: number,
): RatioWithUncertainty {
	if (baseline === 0) {
		return { ratio: Number.NaN, errorMargin: Number.NaN };
	}

	const ratio = value / baseline;
	const errorMargin =
		ratio *
		Math.sqrt(relativeUncertaintyValue ** 2 + relativeUncertaintyBaseline ** 2);

	return { ratio, errorMargin };
}
