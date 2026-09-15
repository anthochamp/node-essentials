/**
 * The exact rounding error of `sum`, where `sum` is the binary64 result of `a +
 * b` — so `a + b === sum + twoSumError(a, b, sum)` with no error at all.
 *
 * Knuth's two-sum, one of the error-free transformations: floating-point
 * addition throws away the bits that did not fit, and this recovers them. Six
 * additions, no branch, no allocation, and no ordering requirement on `a` and
 * `b`.
 *
 * The caller passes `sum` rather than receiving it because JavaScript has no
 * multiple return values, and an object or tuple would allocate on every call —
 * unacceptable in the per-element loops this exists for.
 *
 * Exact whenever `sum` is finite. If `a + b` overflowed there is no error term
 * to recover and the result is `NaN`.
 *
 * @param a First term, exactly as passed to the addition.
 * @param b Second term, exactly as passed to the addition.
 * @param sum The binary64 result of `a + b`.
 * @returns The part of `a + b` that `sum` dropped.
 */
export function twoSumError(a: number, b: number, sum: number): number {
	const aRounded = sum - b;
	const bRounded = sum - aRounded;

	return a - aRounded + (b - bRounded);
}

/**
 * The exact rounding error of `sum`, where `sum` is the binary64 result of `a +
 * b` **and `|a| >= |b|` is already known** — three additions instead of
 * {@link twoSumError}'s six.
 *
 * Dekker's fast two-sum. The magnitude precondition is not checked: violating
 * it returns a wrong answer rather than an error, so only use it where the
 * ordering is established by construction.
 *
 * @param a The larger-magnitude term.
 * @param b The smaller-magnitude term.
 * @param sum The binary64 result of `a + b`.
 * @returns The part of `a + b` that `sum` dropped.
 */
export function fastTwoSumError(a: number, b: number, sum: number): number {
	return b - (sum - a);
}
