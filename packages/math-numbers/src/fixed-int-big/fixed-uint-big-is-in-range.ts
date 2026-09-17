import { validateBitWidth } from "./_validate-bit-width.js";
import { fixedUIntBigMax } from "./fixed-uint-big-max.js";

/**
 * Whether `value` already fits a `bitWidth`-bit unsigned integer, so no
 * overflow policy has to be consulted.
 *
 * @param value - The value to test.
 * @param bitWidth - Width of the integer, in bits.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 */
export function fixedUIntBigIsInRange(
	value: bigint,
	bitWidth: number,
): boolean {
	validateBitWidth(bitWidth);

	return value >= 0n && value <= fixedUIntBigMax(bitWidth);
}
