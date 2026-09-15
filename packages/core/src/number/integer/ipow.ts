/**
 * Exact integer power by square-and-multiply, completing `Math.pow`/`**`, which
 * go through floats and stop being exact well before the safe-integer limit.
 *
 * O(log exponent) multiplications.
 *
 * @param base - An integer base.
 * @param exponent - A non-negative integer exponent.
 * @returns `base ** exponent`, or `null` when the exact result is not a safe
 *   integer — the same overflow signal {@link ipow10} uses.
 * @throws {RangeError} When `base` is not an integer, or `exponent` is negative
 *   or not an integer.
 */
export function ipow(base: number, exponent: number): number | null {
	if (!Number.isInteger(base)) {
		throw new RangeError("Base must be an integer");
	}

	if (!Number.isInteger(exponent) || exponent < 0) {
		throw new RangeError("Exponent must be a non-negative integer");
	}

	let result = 1;
	let factor = base;
	let remaining = exponent;

	while (remaining > 0) {
		if (remaining % 2 === 1) {
			result *= factor;

			if (!Number.isSafeInteger(result)) {
				return null;
			}
		}

		remaining = Math.floor(remaining / 2);

		if (remaining > 0) {
			factor *= factor;

			if (!Number.isSafeInteger(factor)) {
				return null;
			}
		}
	}

	return result;
}
