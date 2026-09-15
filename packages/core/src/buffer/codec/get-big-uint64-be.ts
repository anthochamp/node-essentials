import { getUint32Be } from "./get-uint32-be.js";

/**
 * Reads a big-endian unsigned integer from `data` at `offset`.
 *
 * The caller is responsible for ensuring that `byteLength` bytes are available
 * at `offset`.
 *
 * @param data - The bytes to read from.
 * @param offset - The index of the first byte to read.
 * @param byteLength - How many bytes to read, in the 0..8 range. Defaults to 8
 *   (a full word); fewer bytes read a narrower big-endian integer formed from
 *   just those leading bytes.
 * @returns The value as an unsigned 64-bit integer.
 */
export function getBigUint64Be(
	data: Uint8Array,
	offset: number,
	byteLength = 8,
): bigint {
	const highByteLength = Math.max(0, Math.min(4, byteLength - 4));
	const lowByteLength = Math.min(4, byteLength);

	if (byteLength <= 4) {
		return BigInt(getUint32Be(data, offset, lowByteLength));
	}

	return (
		(BigInt(getUint32Be(data, offset, highByteLength)) << 32n) |
		BigInt(getUint32Be(data, offset + highByteLength, lowByteLength))
	);
}
