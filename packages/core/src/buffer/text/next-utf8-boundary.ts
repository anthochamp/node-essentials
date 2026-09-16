// A UTF-8 continuation byte is `0b10xxxxxx`; every other byte starts a character.
const CONTINUATION_MASK_ = 0b1100_0000;
const CONTINUATION_BITS_ = 0b1000_0000;

/**
 * Index of the first UTF-8 character boundary at or after `index`.
 *
 * Slicing a UTF-8 buffer at an arbitrary offset can land inside a multi-byte
 * sequence, whose orphaned tail decodes to a leading U+FFFD. Moving the offset
 * forward to a boundary drops the partial character instead.
 *
 * Runs in O(1) on valid input — a sequence is at most four bytes long, so at
 * most three continuation bytes are skipped — and in O(n) on the length of a
 * malformed continuation run. Allocates nothing.
 *
 * @param bytes - UTF-8 encoded bytes.
 * @param index - Offset to align. Negative values align to `0`.
 * @returns The aligned offset, within `[0, bytes.length]`.
 */
export function nextUtf8Boundary(bytes: Uint8Array, index: number): number {
	let boundary = Math.max(0, index);

	while (
		boundary < bytes.length &&
		(bytes[boundary]! & CONTINUATION_MASK_) === CONTINUATION_BITS_
	) {
		boundary++;
	}

	return Math.min(boundary, bytes.length);
}
