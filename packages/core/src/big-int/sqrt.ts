import { bigIntBitLength } from "./bit-length.js";

/**
 * Floor of the integer square root: the largest `r` with `r² ≤ value`.
 *
 * @throws {RangeError} When `value` is negative.
 */
export function bigIntSqrt(value: bigint): bigint {
	if (value < 0n) {
		throw new RangeError("Square root of a negative integer is not real");
	}

	if (value < 2n) {
		return value;
	}

	// Newton's method from a bit-length seed; the float path loses precision
	// past 2⁵³, so it cannot be used to seed large values.
	let guess = 1n << BigInt((bigIntBitLength(value) + 1) >> 1);

	for (;;) {
		const next = (guess + value / guess) >> 1n;

		if (next >= guess) {
			return guess;
		}

		guess = next;
	}
}
