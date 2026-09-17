import { numericConfig } from "../globals.js";
import { type OverflowMode, OverflowError } from "../overflow-mode.js";
import { validateBitWidth } from "./_validate-bit-width.js";
import { fixedSIntBigMax } from "./fixed-sint-big-max.js";
import { fixedSIntBigMin } from "./fixed-sint-big-min.js";

/**
 * Brings an arbitrary `bigint` into a `bitWidth`-bit two's-complement integer
 * under `mode`.
 *
 * Every signed operation in this directory ends here: each one computes its
 * exact `bigint` result, which cannot overflow, and hands it over to be fitted.
 * That is what keeps the overflow policy in one place instead of once per
 * operation.
 *
 * `mode` is read from {@link numericConfig} when omitted, and read on each call
 * rather than captured, so changing the global takes effect immediately. One
 * default at every width, deliberately: a policy that changed at 64 bits would
 * make the same expression mean different things depending on the type it was
 * written for.
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
export function fixedSIntBigFrom(
	value: bigint,
	bitWidth: number,
	mode: OverflowMode = numericConfig.defaultOverflowMode,
): bigint {
	validateBitWidth(bitWidth);

	const min = fixedSIntBigMin(bitWidth);
	const max = fixedSIntBigMax(bitWidth);

	if (value >= min && value <= max) {
		return value;
	}

	switch (mode) {
		case "wrap":
			return BigInt.asIntN(bitWidth, value);
		case "clamp":
			return value < min ? min : max;
		case "abort":
			throw new OverflowError(
				`${value} does not fit a ${bitWidth}-bit signed integer`,
			);
	}
}
