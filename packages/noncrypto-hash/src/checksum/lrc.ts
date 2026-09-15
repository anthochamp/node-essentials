/**
 * Computes the longitudinal redundancy check (two's-complement negated sum) of
 * `data`, as used by Modbus ASCII and Intel HEX.
 *
 * The sum of `data` and its LRC is always `0 mod 256`, which is the usual way a
 * receiver verifies the check byte: sum every byte including the LRC itself and
 * confirm the low 8 bits are zero.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @returns An unsigned 8-bit check byte.
 */
export function lrc(data: Uint8Array): number {
	let sum = 0;

	for (let i = 0; i < data.length; i++) {
		sum += data[i]!;
	}

	return (-sum & 0xff) >>> 0;
}
