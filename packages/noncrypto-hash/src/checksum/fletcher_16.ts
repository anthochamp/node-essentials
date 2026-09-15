const MOD_FLETCHER16_ = 255;

/**
 * Computes the Fletcher-16 checksum of `data` (John Fletcher, 1982).
 *
 * Two running sums mod 255 of individual bytes — weaker error detection than a
 * CRC of the same degree, but cheaper: no polynomial division, only addition
 * and a compare-and-subtract-equivalent modulus.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @returns An unsigned 16-bit checksum, the high byte holding the sum of sums
 *   and the low byte holding the sum of bytes.
 */
export function fletcher_16(data: Uint8Array): number {
	let sum1 = 0;
	let sum2 = 0;

	for (let i = 0; i < data.length; i++) {
		sum1 = (sum1 + data[i]!) % MOD_FLETCHER16_;
		sum2 = (sum2 + sum1) % MOD_FLETCHER16_;
	}

	return ((sum2 << 8) | sum1) >>> 0;
}
