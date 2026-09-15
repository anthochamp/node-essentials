import { mask64 } from "./mask64.js";
import { popCount64 } from "./pop-count64.js";

/**
 * Counts the set bits across a `bigint` of any width (Hamming weight), where
 * {@link popCount64} stops at the low 64.
 *
 * The magnitude is counted, so a negative value answers the same as its
 * absolute value. Two's complement would otherwise make every negative number
 * infinitely wide, which is not a count anyone can use.
 *
 * O(n / 64) iterations for an n-bit value, each one a constant-time SWAR
 * reduction, rather than the O(n) shift-and-test a per-bit loop costs.
 *
 * @param value The value to count.
 * @returns The number of set bits in `|value|`.
 */
export function bigIntPopCount(value: bigint): number {
	let remaining = value < 0n ? -value : value;
	let count = 0;

	while (remaining !== 0n) {
		count += popCount64(mask64(remaining));
		remaining >>= 64n;
	}

	return count;
}
