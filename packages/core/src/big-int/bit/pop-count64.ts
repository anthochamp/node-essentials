import { MASK_64N } from "../../constants/mask.js";
import { mask64 } from "./mask64.js";

/**
 * Counts the set bits in the low 64 bits of `value` (Hamming weight).
 *
 * The 64-bit counterpart of {@link popcount32}: the same SWAR reduction with
 * `bigint` masks and a final byte-sum multiply instead of a loop.
 *
 * @param value - The value to count; only its low 64 bits are considered.
 * @returns The number of set bits, from 0 to 64.
 */
export function popCount64(value: bigint): number {
	let v = mask64(value);

	v = v - ((v >> 1n) & 0x5555555555555555n);
	v = (v & 0x3333333333333333n) + ((v >> 2n) & 0x3333333333333333n);
	v = (v + (v >> 4n)) & 0x0f0f0f0f0f0f0f0fn;
	v = (v * 0x0101010101010101n) & MASK_64N;

	return Number((v >> 56n) & 0xffn);
}
