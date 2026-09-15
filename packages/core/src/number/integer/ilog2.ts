import { bitLength } from "./bit-length.js";

/**
 * Floor of log₂ for a positive integer `value`, with none of the rounding
 * `Math.log2` introduces near a power of two.
 *
 * @throws {RangeError} When `value` is zero or negative.
 */
export function ilog2(value: number): number {
	if (value <= 0) {
		throw new RangeError("Logarithm of a non-positive integer is undefined");
	}

	return bitLength(value) - 1;
}
