import { CONTINUATION_BIT, RADIX } from "../_base128.js";
import { vlqByteLength } from "./vlq-byte-length.js";

/**
 * Writes `value` into `target` at `offset`, most significant group first.
 *
 * The in-place counterpart of {@link encodeVlq}, for a caller assembling several
 * values into one buffer without allocating per value.
 *
 * @param target - Destination, which must hold {@link vlqByteLength} bytes from
 *   `offset`.
 * @param offset - Where to start writing.
 * @param value - A non-negative safe integer.
 * @returns The offset just past the bytes written.
 * @throws {RangeError} When `value` is out of range, or `target` is too short.
 */
export function writeVlq(
	target: Uint8Array,
	offset: number,
	value: number,
): number {
	const length = vlqByteLength(value);

	if (offset < 0 || offset + length > target.length) {
		throw new RangeError(
			`writeVlq: ${length} bytes at offset ${offset} do not fit in ${target.length}`,
		);
	}

	let remaining = value;

	// Filled back to front: the least significant group is known first but
	// belongs last, and only the final byte clears the continuation bit.
	for (let index = length - 1; index >= 0; index--) {
		const group = remaining % RADIX;
		target[offset + index] =
			index === length - 1 ? group : group | CONTINUATION_BIT;
		remaining = Math.floor(remaining / RADIX);
	}

	return offset + length;
}
