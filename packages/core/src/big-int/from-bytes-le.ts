/**
 * Decodes two's complement, little-endian bytes back into a `bigint` — the
 * inverse of {@link bigIntToBytesLe}.
 *
 * The high bit of the _last_ byte is the sign, so any width round-trips: `0xff`
 * and `0xff_ff` both decode to `-1`. Reach for {@link bigIntFromBytesBe} when
 * the most significant byte comes first, which is what wire formats usually
 * specify.
 *
 * Time complexity: O(n) in the byte count.
 *
 * @param bytes - The encoding. An empty input decodes to zero.
 */
export function bigIntFromBytesLe(bytes: Uint8Array): bigint {
	let value = 0n;

	for (let index = bytes.length - 1; index >= 0; index--) {
		value = (value << 8n) | BigInt(bytes[index]!);
	}

	return BigInt.asIntN(bytes.length * 8, value);
}
