/**
 * Computes the plain XOR checksum of `data` — the running XOR of every byte.
 *
 * Detects any single-bit error but nothing that flips an even number of bits in
 * the same column across the message; used where the cost of anything more
 * cannot be justified (NMEA 0183, Intel HEX, Modbus ASCII).
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @returns An unsigned 8-bit checksum.
 */
export function xorSum(data: Uint8Array): number {
	let checksum = 0;

	for (let i = 0; i < data.length; i++) {
		checksum ^= data[i]!;
	}

	return checksum;
}
