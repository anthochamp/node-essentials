import { mask64 } from "./mask64.js";

/**
 * Logical right shift of the low 64 bits — JavaScript's missing `>>>` for
 * `bigint`, which only has the sign-propagating `>>`.
 *
 * The value is taken as an unsigned 64-bit word first, so a negative operand
 * shifts in zeros from its two's complement pattern rather than ones. A shift
 * of 64 or more clears the word, matching what a 64-bit machine instruction
 * would leave behind rather than C's undefined behaviour.
 *
 * @param value The word to shift; only its low 64 bits are considered.
 * @param count Bit positions to shift by. Zero or less returns the word
 *   unchanged apart from the masking.
 * @returns The shifted word, always non-negative.
 */
export function shiftRightUnsigned64(value: bigint, count: number): bigint {
	const word = mask64(value);

	if (count <= 0) {
		return word;
	}

	if (count >= 64) {
		return 0n;
	}

	return word >> BigInt(count);
}
