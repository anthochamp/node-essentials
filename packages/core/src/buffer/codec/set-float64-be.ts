/**
 * Writes `value` into `target` at `offset` as a big-endian IEEE 754
 * double-precision (binary64) float.
 *
 * The caller is responsible for ensuring that eight bytes are available at
 * `offset`.
 *
 * @param target - The bytes to write into.
 * @param offset - The index of the first byte to write.
 * @param value - The value to write.
 */
export function setFloat64Be(
	target: Uint8Array,
	offset: number,
	value: number,
): void {
	new DataView(target.buffer, target.byteOffset + offset, 8).setFloat64(
		0,
		value,
		false,
	);
}
