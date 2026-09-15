import { mask64 } from "./mask64.js";

/**
 * Computes the wide product of two 64-bit `bigint`s, returning the low and high
 * 64 bits of the result.
 */
export function mulWide64(
	lhs: bigint,
	rhs: bigint,
): { low: bigint; high: bigint } {
	const product = lhs * rhs;

	return { low: mask64(product), high: mask64(product >> 64n) };
}
