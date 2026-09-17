import { validateBitWidth } from "./_validate-bit-width.js";

/**
 * Bitwise complement of a `bitWidth`-bit unsigned integer.
 *
 * The only bitwise operation that is not shared between the two sign
 * conventions. `&`, `|` and `^` are closed over both ranges and are plain
 * `bigint` operators, and a signed complement is `~value` — already in range,
 * since two's complement makes it `-value - 1`. An unsigned one is not:
 * `~value` is negative for every input, so the pattern has to be truncated back
 * into the width.
 *
 * @param value - The value to complement.
 * @param bitWidth - Width of the integer, in bits.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 */
export function fixedUIntBigNot(value: bigint, bitWidth: number): bigint {
	validateBitWidth(bitWidth);

	return BigInt.asUintN(bitWidth, ~value);
}
