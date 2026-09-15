/**
 * Decodes two's complement, big-endian bytes back into a `bigint` — the inverse
 * of {@link bigIntToBytesBe}.
 *
 * The high bit of the first byte is the sign, so any width round-trips: `0xff`
 * and `0xff_ff` both decode to `-1`.
 *
 * Time complexity: O(n) in the byte count.
 *
 * @param bytes - The encoding. An empty input decodes to zero.
 */
export function bigIntFromBytesBe(bytes: Uint8Array): bigint {
	if (bytes.length === 0) {
		return 0n;
	}

	const negative = (bytes[0]! & 0x80) !== 0;
	let value = 0n;

	for (let index = 0; index < bytes.length; index++) {
		value = (value << 8n) | BigInt(bytes[index]!);
	}

	return negative ? value - (1n << BigInt(bytes.length * 8)) : value;
}
