import { getUint32Le } from "./get-uint32-le.js";

/**
 * Reads a little-endian unsigned integer from `data` at `offset`.
 *
 * The caller is responsible for ensuring that `byteLength` bytes are available
 * at `offset`.
 *
 * @param data - The bytes to read from.
 * @param offset - The index of the first byte to read.
 * @param byteLength - How many bytes to read, in the 0..8 range. Defaults to 8
 *   (a full word); fewer bytes read a narrower little-endian integer formed
 *   from just those leading bytes, which for little-endian is equivalent to
 *   zero-padding the missing high bytes.
 * @returns The value as an unsigned 64-bit integer.
 */
export function getBigUint64Le(
	data: Uint8Array,
	offset: number,
	byteLength = 8,
): bigint {
	const lowByteLength = Math.min(4, byteLength);
	const highByteLength = Math.max(0, Math.min(4, byteLength - 4));

	if (byteLength <= 4) {
		return BigInt(getUint32Le(data, offset, lowByteLength));
	}

	return (
		BigInt(getUint32Le(data, offset, lowByteLength)) |
		(BigInt(getUint32Le(data, offset + 4, highByteLength)) << 32n)
	);
}
