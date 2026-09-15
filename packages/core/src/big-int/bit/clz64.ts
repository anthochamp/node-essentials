import { bigIntBitLength } from "../bit-length.js";
import { mask64 } from "./mask64.js";

/**
 * Counts the leading zero bits in the low 64 bits of `value`.
 *
 * The generalisation of `Math.clz32`, which stops at 32 bits, and the high-end
 * counterpart of {@link ctz64}.
 *
 * @param value - The value to inspect; only its low 64 bits are considered.
 * @returns The number of leading zero bits, from 0 to 64. `clz64(0n)` is 64,
 *   matching `Math.clz32(0)` being 32.
 */
export function clz64(value: bigint): number {
	return 64 - bigIntBitLength(mask64(value));
}
