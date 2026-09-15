/**
 * Computes the RFC 1071 Internet checksum of `data` — the one's-complement sum
 * of 16-bit big-endian words, used by IPv4, TCP, UDP and ICMP headers.
 *
 * An odd-length input is padded with an implicit zero byte, per RFC 1071 §1.
 * Every carry out of bit 16 is folded back in (end-around carry), which is what
 * makes the whole scheme independent of the order words are summed in — RFC
 * 1071 §2 relies on this to update a running checksum incrementally.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @returns The one's complement of the folded sum, as an unsigned 16-bit value.
 */
export function inetSum(data: Uint8Array): number {
	let sum = 0;

	for (let i = 0; i < data.length; i += 2) {
		const high = data[i]!;
		const low = i + 1 < data.length ? data[i + 1]! : 0;

		sum += (high << 8) | low;
	}

	while (sum >>> 16) {
		sum = (sum & 0xffff) + (sum >>> 16);
	}

	return ~sum & 0xffff;
}
