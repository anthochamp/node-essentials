/**
 * Rotates `value` left within 32 bits.
 *
 * JavaScript has no unsigned 32-bit integer type, so bit rotation has to be
 * emulated with the shift operators, which discard the bits a real rotation
 * would wrap around.
 *
 * @param value - The value to rotate; only its low 32 bits are considered.
 * @param count - The rotation distance, taken modulo 32.
 * @returns The rotated value as an unsigned 32-bit integer.
 */
export function rotl32(value: number, count: number): number {
	return ((value << count) | (value >>> (32 - count))) >>> 0;
}
