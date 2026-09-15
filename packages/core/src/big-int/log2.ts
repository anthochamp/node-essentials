import { bigIntBitLength } from "./bit-length.js";

/**
 * Floor of log₂ for a positive `value`, with none of the rounding `Math.log2`
 * introduces once the value leaves the exactly-representable range.
 *
 * @throws {RangeError} When `value` is zero or negative.
 */
export function bigIntLog2(value: bigint): number {
	if (value <= 0n) {
		throw new RangeError("Logarithm of a non-positive integer is undefined");
	}

	return bigIntBitLength(value) - 1;
}
