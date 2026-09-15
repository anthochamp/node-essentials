import { mask64 } from "./mask64.js";
import { popCount64 } from "./pop-count64.js";

/**
 * Counts the trailing zero bits in the low 64 bits of `value`.
 *
 * The 64-bit counterpart of {@link ctz32} — see its doc for the `value & -value`
 * isolation trick this composes with {@link popCount64}.
 *
 * @param value - The value to inspect; only its low 64 bits are considered.
 * @returns The number of trailing zero bits, from 0 to 64.
 */
export function ctz64(value: bigint): number {
	const x = mask64(value);

	return popCount64((x & -x) - 1n);
}
