import { numericConfig } from "../globals.js";
import { type OverflowMode, OverflowError } from "../overflow-mode.js";
import { validateBitWidth } from "./_validate-bit-width.js";
import { fixedUIntBigMax } from "./fixed-uint-big-max.js";

/**
 * Brings an arbitrary `bigint` into a `bitWidth`-bit unsigned integer under
 * `mode`.
 *
 * Every unsigned operation in this directory ends here, for the same reason
 * {@link fixedSIntBigFrom} collects the signed ones: the exact `bigint` result
 * cannot overflow, so the policy applies once, at the end.
 *
 * @param value - The exact value to fit.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @returns `value` itself when it already fits, and otherwise the wrapped,
 *   clamped or (for `abort`) never-returned result.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 * @throws {OverflowError} When `value` does not fit and `mode` is `abort`.
 */
export function fixedUIntBigFrom(
	value: bigint,
	bitWidth: number,
	mode: OverflowMode = numericConfig.defaultOverflowMode,
): bigint {
	validateBitWidth(bitWidth);

	const max = fixedUIntBigMax(bitWidth);

	if (value >= 0n && value <= max) {
		return value;
	}

	switch (mode) {
		case "wrap":
			return BigInt.asUintN(bitWidth, value);
		case "clamp":
			return value < 0n ? 0n : max;
		case "abort":
			throw new OverflowError(
				`${value} does not fit a ${bitWidth}-bit unsigned integer`,
			);
	}
}
