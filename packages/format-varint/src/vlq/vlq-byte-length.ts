import { RADIX } from "../_base128.js";

/**
 * How many bytes {@link encodeVlq} will produce for `value`.
 *
 * Time complexity: O(log₁₂₈ value) — at most 8 iterations for any safe integer.
 *
 * @param value - A non-negative safe integer.
 * @returns The byte count, at least 1.
 * @throws {RangeError} When `value` is negative, fractional, or beyond
 *   `Number.MAX_SAFE_INTEGER`.
 */
export function vlqByteLength(value: number): number {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new RangeError(
			`vlqByteLength: value must be a non-negative safe integer, got ${value}`,
		);
	}

	let length = 1;
	let remaining = value;

	while (remaining >= RADIX) {
		remaining = Math.floor(remaining / RADIX);
		length++;
	}

	return length;
}
