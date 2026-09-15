/**
 * Tests whether two numbers are within an absolute tolerance of each other: `|a
 *
 * - B| <= absTolerance`.
 *
 * The only form defined at the origin, and therefore the one to reach for when
 * the operands may straddle zero — a determinant about to be divided by, a
 * distance about to be normalised. It needs a tolerance meaningful in the
 * caller's units, so it degrades once the operands are far from that scale;
 * {@link isCloseTo} pairs it with a relative bound for that case.
 *
 * @param a - The first number to compare.
 * @param b - The second number to compare.
 * @param absTolerance - The absolute tolerance, in the operands' own units.
 * @returns `true` if the numbers are within `absTolerance`, `false` otherwise.
 */
export function isCloseAbsolute(
	a: number,
	b: number,
	absTolerance: number,
): boolean {
	if (a === b) {
		// exact match, and handles +0 === -0 and ±Infinity against itself
		return true;
	}

	if (!Number.isFinite(a) || !Number.isFinite(b)) {
		// NaN is close to nothing, and an infinity only to the same infinity
		return false;
	}

	return Math.abs(a - b) <= absTolerance;
}
