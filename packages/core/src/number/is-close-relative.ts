/**
 * Tests whether two numbers are within a relative tolerance of each other: `|a
 *
 * - B| <= relTolerance * max(|a|, |b|)`.
 *
 * Scale-free, and therefore undefined at the origin — the bound collapses to
 * `|a| <= relTolerance * |a|`, false for every non-zero `a`. Nothing but `0` is
 * ever relatively close to `0`. Use {@link isCloseAbsolute} for values that
 * straddle zero, or {@link isCloseTo} to combine the two.
 *
 * No default: a relative tolerance is a claim about how much error the
 * computation that produced `a` and `b` may have accumulated, which only the
 * caller knows.
 *
 * @param a - The first number to compare.
 * @param b - The second number to compare.
 * @param relTolerance - The relative tolerance.
 * @returns `true` if the numbers are close within the specified relative
 *   tolerance, `false` otherwise.
 */
export function isCloseRelative(
	a: number,
	b: number,
	relTolerance: number,
): boolean {
	if (a === b) {
		// exact match, and handles +0 === -0 and ±Infinity against itself
		return true;
	}

	if (!Number.isFinite(a) || !Number.isFinite(b)) {
		// NaN is close to nothing, and an infinity only to the same infinity
		return false;
	}

	return Math.abs(a - b) <= relTolerance * Math.max(Math.abs(a), Math.abs(b));
}
