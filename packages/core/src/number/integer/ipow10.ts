import { POWERS_OF_TEN } from "./_powers-of-ten.js";

/**
 * Computes `10^exp` with `exp` an integer, returning a native `number` if the
 * result is a safe integer, or `null` if the result would exceed
 * `Number.MAX_SAFE_INTEGER`.
 *
 * Uses the pre-built 19-entry const table — O(1) lookup.
 *
 * @param exp - The exponent integer.
 * @returns The result of `10^exp` as a native `number`, or `null` if the
 */
export function ipow10(exp: number): number | null {
	if (exp < 0 || exp >= POWERS_OF_TEN.length) {
		return null;
	}

	return POWERS_OF_TEN[exp] ?? null;
}
