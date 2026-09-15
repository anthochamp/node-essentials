import { expect } from "vitest";

/**
 * Asserts that `actual` matches `expected` to within a **relative** tolerance.
 *
 * Vitest's `toBeCloseTo` counts decimal places, which is an absolute measure:
 * the same call that usefully pins `0.5` to fifteen digits passes on anything
 * at all for `1e308` and fails on everything for `1e-45`. Numerical code is
 * specified in relative error, so that is what this compares.
 *
 * Exact equality short-circuits first, so a pair of zeros — where a relative
 * error is `0/0` — passes rather than reporting `NaN`.
 *
 * @param actual Value under test.
 * @param expected Reference value, typically from an independent
 *   implementation.
 * @param tolerance Largest acceptable `|actual / expected − 1|`. Defaults to
 *   `1e-14`, about fifty times binary64's epsilon — tight enough to catch a
 *   wrong algorithm, loose enough to survive a differently-associated sum.
 */
export function expectCloseRelative(
	actual: number,
	expected: number,
	tolerance = 1e-14,
): void {
	if (actual === expected) {
		return;
	}

	const error = Math.abs(actual / expected - 1);

	expect(
		error,
		`expected ${actual} to be within ${tolerance} relative of ${expected}`,
	).toBeLessThanOrEqual(tolerance);
}
