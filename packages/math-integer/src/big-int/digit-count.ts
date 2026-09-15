import { bigIntAbs, bigIntLog10 } from "@ac-kit/core";

/**
 * How many digits `|value|` takes in `radix` — `1` for zero, which still reads
 * as one digit.
 *
 * Base ten goes through {@link bigIntLog10}, which is O(log log n); any other
 * radix has no such shortcut and materialises the numeral, which is O(n²/k) in
 * the digit count.
 *
 * @param value The value to measure. Its sign is ignored.
 * @param radix The base, from 2 to 36. Defaults to 10.
 * @returns The digit count, at least one.
 * @throws {RangeError} If `radix` is not an integer in `[2, 36]`.
 */
export function bigIntDigitCount(value: bigint, radix = 10): number {
	if (!Number.isInteger(radix) || radix < 2 || radix > 36) {
		throw new RangeError(
			`bigIntDigitCount: radix must be in [2, 36], got ${radix}`,
		);
	}

	const magnitude = bigIntAbs(value);

	if (magnitude === 0n) {
		return 1;
	}

	return radix === 10
		? bigIntLog10(magnitude) + 1
		: magnitude.toString(radix).length;
}
