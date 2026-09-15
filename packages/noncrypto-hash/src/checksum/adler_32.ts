const MOD_ADLER_ = 65521;

/**
 * Computes the Adler-32 checksum of `data` (Mark Adler, used by zlib).
 *
 * Two running sums mod 65521 (the largest prime below 2¹⁶), one of the bytes
 * themselves and one of the running total of the first — weaker error detection
 * than a CRC-32 of the same degree, but far cheaper to compute and, unlike a
 * CRC, trivial to update incrementally as a byte leaves a fixed-size window.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @returns An unsigned 32-bit checksum, the high 16 bits holding the sum of
 *   sums and the low 16 bits holding the sum of bytes.
 */
export function adler_32(data: Uint8Array): number {
	let a = 1;
	let b = 0;

	// Reduce every 5552 bytes (the largest count that cannot overflow a
	// 32-bit accumulator between reductions) rather than after every byte.
	const NMAX = 5552;
	let offset = 0;

	while (offset < data.length) {
		const blockEnd = Math.min(offset + NMAX, data.length);

		while (offset < blockEnd) {
			a += data[offset]!;
			b += a;
			offset++;
		}

		a %= MOD_ADLER_;
		b %= MOD_ADLER_;
	}

	return ((b << 16) | a) >>> 0;
}
