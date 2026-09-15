/**
 * Reverses the byte order within the low 32 bits of `value` — an endian swap of
 * a value already in hand, distinct from `getUint32Le`/`setUint32Le`, which
 * convert between a `Uint8Array` and a number at a chosen endianness rather
 * than flipping one already-extracted value.
 *
 * @param value - The value to byte-swap; only its low 32 bits are considered.
 * @returns The byte-swapped value as an unsigned 32-bit integer.
 */
export function byteSwap32(value: number): number {
	const v = value >>> 0;

	return (
		(((v & 0xff) << 24) |
			((v & 0xff00) << 8) |
			((v >>> 8) & 0xff00) |
			((v >>> 24) & 0xff)) >>>
		0
	);
}
