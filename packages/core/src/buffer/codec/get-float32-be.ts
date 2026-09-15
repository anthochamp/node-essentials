/**
 * Reads a big-endian IEEE 754 single-precision (binary32) float from `data` at
 * `offset`.
 *
 * @param data - The bytes to read from.
 * @param offset - The index of the first byte to read.
 * @returns The value as a `number`.
 */
export function getFloat32Be(data: Uint8Array, offset: number): number {
	return new DataView(data.buffer, data.byteOffset + offset, 4).getFloat32(
		0,
		false,
	);
}
