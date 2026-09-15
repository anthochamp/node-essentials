const MOD_FLETCHER32_ = 65535;

/**
 * Computes the Fletcher-32 checksum of `data` (John Fletcher, 1982).
 *
 * Two running sums mod 65535 of 16-bit little-endian words — the `data` bytes
 * are assembled into words two at a time, padding an odd-length input with an
 * implicit trailing zero byte. Stronger error detection than
 * {@link fletcher_16} at comparable cost, and comparable to {@link adler_32}
 * with a slightly cheaper modulus (65535 rather than the prime 65521).
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @returns An unsigned 32-bit checksum, the high 16 bits holding the sum of
 *   sums and the low 16 bits holding the sum of words.
 */
export function fletcher_32(data: Uint8Array): number {
	let sum1 = 0;
	let sum2 = 0;
	const { length } = data;

	for (let i = 0; i < length; i += 2) {
		const low = data[i]!;
		const high = i + 1 < length ? data[i + 1]! : 0;
		const word = low | (high << 8);

		sum1 = (sum1 + word) % MOD_FLETCHER32_;
		sum2 = (sum2 + sum1) % MOD_FLETCHER32_;
	}

	return ((sum2 << 16) | sum1) >>> 0;
}
