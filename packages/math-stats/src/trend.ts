/** Mann–Kendall trend statistic and its standardised form. */
export type MannKendallTrend = {
	/**
	 * `S`: the number of increasing ordered pairs minus the number of decreasing
	 * ones. Positive means increasing.
	 */
	readonly statistic: number;

	/**
	 * `S` standardised to a zero-mean, unit-variance statistic under the no-trend
	 * hypothesis, comparable across sample sizes and readable as a standard
	 * normal deviate. `0` when the variance is zero.
	 */
	readonly normalised: number;
};

/**
 * Mann–Kendall trend test statistic: whether a series drifts monotonically,
 * with no assumption about the shape of the underlying distribution and no
 * assumption that the drift is linear.
 *
 * A monotone ramp and an oscillation around a fixed level are what this
 * separates — the first accumulates concordant pairs and drives `S` away from
 * zero, while the second cancels them out. It is unaffected by outliers, since
 * only the sign of each pairwise difference counts, never its size.
 *
 * Ties contribute nothing to `S` and are corrected for in the variance.
 *
 * O(n²) — every ordered pair is compared. Intended for the hundreds-of-points
 * series a monitor collects, not for bulk data.
 *
 * @param values The series, in observation order. Not modified.
 * @returns The statistic and its standardised form, both `0` for a series of
 *   fewer than two values.
 * @see https://en.wikipedia.org/wiki/Mann%E2%80%93Kendall_test
 */
export function mannKendallTrend(values: readonly number[]): MannKendallTrend {
	const count = values.length;
	if (count < 2) {
		return { statistic: 0, normalised: 0 };
	}

	let statistic = 0;
	for (let index = 0; index < count - 1; index++) {
		const value = values[index]!;
		for (let other = index + 1; other < count; other++) {
			statistic += Math.sign(values[other]! - value);
		}
	}

	// Variance of S under the no-trend hypothesis, reduced by each group of
	// tied values: a tie is a pair that could never have contributed.
	let variance = (count * (count - 1) * (2 * count + 5)) / 18;
	for (const tied of countTiedGroups(values)) {
		variance -= (tied * (tied - 1) * (2 * tied + 5)) / 18;
	}

	if (variance <= 0) {
		return { statistic, normalised: 0 };
	}

	// The continuity correction pulls S one unit towards zero, so a single
	// concordant pair does not read as a trend.
	const corrected = statistic - Math.sign(statistic);
	return { statistic, normalised: corrected / Math.sqrt(variance) };
}

function countTiedGroups(values: readonly number[]): number[] {
	const counts = new Map<number, number>();
	for (let index = 0; index < values.length; index++) {
		const value = values[index]!;
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	const groups: number[] = [];
	for (const size of counts.values()) {
		if (size > 1) {
			groups.push(size);
		}
	}
	return groups;
}

/**
 * Fraction of interior points at which a series changes direction.
 *
 * Where {@link mannKendallTrend} answers "is it drifting", this answers "is it
 * oscillating": a thermal ramp climbs steadily and reverses rarely, while a
 * throttling processor alternates and reverses constantly. The two are
 * complementary, and a series can score low on both by being flat.
 *
 * Flat steps are not reversals and do not break a run: a direction persists
 * across equal values until it actually changes.
 *
 * O(n).
 *
 * @param values The series, in observation order. Not modified.
 * @returns The reversal count divided by `n - 2`, in `[0, 1]` — `0` for a
 *   monotone series, `1` for a perfectly alternating one. `0` for a series of
 *   fewer than three values, which has no interior point to reverse at.
 */
export function reversalRate(values: readonly number[]): number {
	const count = values.length;
	if (count < 3) {
		return 0;
	}

	let reversals = 0;
	let previousDirection = 0;
	for (let index = 1; index < count; index++) {
		const direction = Math.sign(values[index]! - values[index - 1]!);
		if (direction === 0) {
			continue;
		}
		if (previousDirection !== 0 && direction !== previousDirection) {
			reversals++;
		}
		previousDirection = direction;
	}

	return reversals / (count - 2);
}
