import { validateBitWidth } from "./_validate-bit-width.js";
import { fixedSIntBigMax } from "./fixed-sint-big-max.js";
import { fixedSIntBigMin } from "./fixed-sint-big-min.js";

/**
 * Whether `value` already fits a `bitWidth`-bit two's-complement integer, so no
 * overflow policy has to be consulted.
 *
 * @param value - The value to test.
 * @param bitWidth - Width of the integer, in bits.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 */
export function fixedSIntBigIsInRange(
	value: bigint,
	bitWidth: number,
): boolean {
	validateBitWidth(bitWidth);

	return (
		value >= fixedSIntBigMin(bitWidth) && value <= fixedSIntBigMax(bitWidth)
	);
}
