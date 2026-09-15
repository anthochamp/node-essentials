/**
 * The smallest outcome whose cumulative probability reaches `probability`.
 *
 * The generalised inverse a discrete distribution needs, since its `cdf` is a
 * step function and has no ordinary inverse. Binary search over the support, so
 * O(log n) evaluations of `cdf` rather than the O(n) a linear scan from the
 * bottom would cost on a distribution centred far from zero.
 *
 * @param cdf The distribution's cumulative function.
 * @param probability Probability in `[0, 1]`.
 * @param lowerBound Smallest outcome in the support.
 * @param upperBound Largest outcome, or `Infinity` for an unbounded family.
 * @returns The quantile.
 */
export function discreteQuantile_(
	cdf: (outcome: number) => number,
	probability: number,
	lowerBound: number,
	upperBound: number,
): number {
	if (probability <= 0) {
		return lowerBound;
	}
	if (probability >= 1) {
		return upperBound;
	}

	let lower = lowerBound;
	let upper = upperBound;

	if (!Number.isFinite(upper)) {
		// Double outward until the target is enclosed, so an unbounded support
		// still costs O(log n) rather than needing a guessed ceiling.
		upper = Math.max(1, lowerBound + 1);
		while (cdf(upper) < probability) {
			upper *= 2;
		}
	}

	while (lower < upper) {
		const middle = Math.floor(lower + (upper - lower) / 2);
		if (cdf(middle) < probability) {
			lower = middle + 1;
		} else {
			upper = middle;
		}
	}

	return lower;
}
