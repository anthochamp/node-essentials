import { bigIntAbs, bigIntPow } from "@ac-kit/core";

/**
 * The digit of `|value|` at `position`, counting powers of `radix` from zero —
 * `0` is the units digit, `2` the hundreds in base ten.
 *
 * `0` for any position the value does not reach, which makes a numeral's
 * leading zeros indistinguishable from absent ones, as they are. Negative
 * positions are below the units digit and so always `0`, an integer having
 * nothing there.
 *
 * O(position) big-integer work, since reaching the digit means dividing by
 * `radix ** position`.
 *
 * @param value The value to read. Its sign is ignored.
 * @param position The power of `radix` to read.
 * @param radix The base, from 2 to 36. Defaults to 10.
 * @returns A digit from `0` to `radix - 1`.
 * @throws {RangeError} If `position` is not an integer, or `radix` is not an
 *   integer in `[2, 36]`.
 */
export function bigIntDigitAt(
	value: bigint,
	position: number,
	radix = 10,
): number {
	if (!Number.isInteger(position)) {
		throw new RangeError(
			`bigIntDigitAt: position must be an integer, got ${position}`,
		);
	}

	if (!Number.isInteger(radix) || radix < 2 || radix > 36) {
		throw new RangeError(
			`bigIntDigitAt: radix must be in [2, 36], got ${radix}`,
		);
	}

	if (position < 0) {
		return 0;
	}

	const base = BigInt(radix);

	return Number((bigIntAbs(value) / bigIntPow(base, position)) % base);
}
