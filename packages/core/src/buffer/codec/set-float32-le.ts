/**
 * Writes `value` into `target` at `offset` as a little-endian IEEE 754
 * single-precision (binary32) float.
 *
 * The caller is responsible for ensuring that four bytes are available at
 * `offset`.
 *
 * @param target - The bytes to write into.
 * @param offset - The index of the first byte to write.
 * @param value - The value to write.
 */
export function setFloat32Le(
	target: Uint8Array,
	offset: number,
	value: number,
): void {
	new DataView(target.buffer, target.byteOffset + offset, 4).setFloat32(
		0,
		value,
		true,
	);
}
