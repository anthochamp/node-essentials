/**
 * Writes `value` into `target` at `offset` as a little-endian unsigned 32-bit
 * integer.
 *
 * The caller is responsible for ensuring that four bytes are available at
 * `offset`.
 *
 * @param target - The bytes to write into.
 * @param offset - The index of the first byte to write.
 * @param value - The value to write; only its low 32 bits are used.
 */
export function setUint32Le(
	target: Uint8Array,
	offset: number,
	value: number,
): void {
	target[offset] = value & 0xff;
	target[offset + 1] = (value >>> 8) & 0xff;
	target[offset + 2] = (value >>> 16) & 0xff;
	target[offset + 3] = (value >>> 24) & 0xff;
}
