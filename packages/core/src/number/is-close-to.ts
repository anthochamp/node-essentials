export type IsCloseToOptions = {
	/** Bound proportional to the larger operand. Defaults to `0`. */
	relTol?: number;
	/**
	 * Bound in the operands' own units, the only one defined at zero. Defaults to
	 * `0`.
	 */
	absTol?: number;
};

/**
 * Tests whether two numbers are close under a relative bound, an absolute
 * bound, or whichever of the two is looser: `|a - b| <= max(relTol * max(|a|,
 * |b|), absTol)`.
 *
 * The general form, and the one to reach for by default: the relative bound
 * carries across scales but collapses at the origin, while the absolute bound
 * holds at the origin but stops meaning anything far from it. Because `|d| <=
 * max(x, y)` is `|d| <= x || |d| <= y`, this is exactly `isCloseRelative(a, b,
 * relTol) || isCloseAbsolute(a, b, absTol)`, evaluated in one pass.
 *
 * Symmetric, unlike NumPy's `atol + rtol * |b|` — swapping the operands never
 * changes the answer.
 *
 * No defaults: a tolerance is a claim about the computation that produced `a`
 * and `b`, which only the caller can make. Omitting both bounds asks for exact
 * equality.
 *
 * @param a - The first number to compare.
 * @param b - The second number to compare.
 * @param tolerance - The relative and absolute bounds to accept.
 * @returns `true` if the numbers are close under either bound, `false`
 *   otherwise.
 */
export function isCloseTo(
	a: number,
	b: number,
	tolerance?: IsCloseToOptions,
): boolean {
	if (a === b) {
		// exact match, and handles +0 === -0 and ±Infinity against itself
		return true;
	}

	if (!Number.isFinite(a) || !Number.isFinite(b)) {
		// NaN is close to nothing, and an infinity only to the same infinity
		return false;
	}

	const { relTol = 0, absTol = 0 } = tolerance ?? {};
	const difference = Math.abs(a - b);

	return (
		difference <= absTol ||
		difference <= relTol * Math.max(Math.abs(a), Math.abs(b))
	);
}
