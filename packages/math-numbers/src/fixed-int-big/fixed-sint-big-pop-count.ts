import { bigIntPopCount } from "@ac-kit/core";

import { fixedSIntBigToUnsigned } from "./fixed-sint-big-to-unsigned.js";

/**
 * Set bits in the `bitWidth`-bit two's-complement pattern of `value`: `-1n` at
 * 8 bits answers `8`.
 *
 * Distinct from `@ac-kit/core`'s `bigIntPopCount`, which counts the magnitude
 * and would answer `1` for the same input. Both are right for what they are
 * asked — an unbounded `bigint` has no finite two's-complement pattern to count
 * — and `bitWidth` is exactly what supplies the missing one.
 *
 * @param value - The value to count.
 * @param bitWidth - Width of the integer, in bits.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 */
export function fixedSIntBigPopCount(value: bigint, bitWidth: number): number {
	return bigIntPopCount(fixedSIntBigToUnsigned(value, bitWidth));
}
