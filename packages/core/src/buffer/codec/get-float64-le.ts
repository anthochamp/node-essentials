/**
 * Reads a little-endian IEEE 754 double-precision (binary64) float from `data`
 * at `offset`.
 *
 * @param data - The bytes to read from.
 * @param offset - The index of the first byte to read.
 * @returns The value as a `number`.
 */
export function getFloat64Le(data: Uint8Array, offset: number): number {
	return new DataView(data.buffer, data.byteOffset + offset, 8).getFloat64(
		0,
		true,
	);
}
