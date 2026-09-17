/**
 * Decodes two's complement, big-endian bytes back into a `bigint` — the inverse
 * of {@link bigIntToBytesBe}.
 *
 * The high bit of the first byte is the sign, so any width round-trips: `0xff`
 * and `0xff_ff` both decode to `-1`. Reach for {@link bigIntFromBytesLe} when
 * the least significant byte comes first.
 *
 * Time complexity: O(n) in the byte count.
 *
 * @param bytes - The encoding. An empty input decodes to zero.
 */
export function bigIntFromBytesBe(bytes: Uint8Array): bigint {
	let value = 0n;

	for (let index = 0; index < bytes.length; index++) {
		value = (value << 8n) | BigInt(bytes[index]!);
	}

	return BigInt.asIntN(bytes.length * 8, value);
}
