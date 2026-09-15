/**
 * Reads a big-endian unsigned integer from `data` at `offset`.
 *
 * Unlike `DataView.getUint32`, this reads straight from the array and therefore
 * needs no view object per call. The caller is responsible for ensuring that
 * `byteLength` bytes are available at `offset`.
 *
 * @param data - The bytes to read from.
 * @param offset - The index of the first byte to read.
 * @param byteLength - How many bytes to read, in the 0..4 range. Defaults to 4
 *   (a full word); fewer bytes read a narrower big-endian integer formed from
 *   just those leading bytes — not a zero-padded full word — for a binary
 *   format's variable-width or partial trailing fields.
 * @returns The value as an unsigned 32-bit integer.
 */
export function getUint32Be(
	data: Uint8Array,
	offset: number,
	byteLength = 4,
): number {
	if (byteLength === 4) {
		return (
			((data[offset]! << 24) |
				(data[offset + 1]! << 16) |
				(data[offset + 2]! << 8) |
				data[offset + 3]!) >>>
			0
		);
	}

	let value = 0;
	for (let i = 0; i < byteLength; i++) {
		value = ((value << 8) | data[offset + i]!) >>> 0;
	}
	return value;
}
