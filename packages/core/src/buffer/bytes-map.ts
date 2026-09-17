/**
 * Applies `map` to every octet of `bytes`, returning a new array.
 *
 * The result of `map` is masked to one octet, so a caller may write `~byte`
 * without restating `& 0xff`.
 *
 * Complexity: O(n) time and O(n) memory in the input length.
 *
 * @param bytes The source octets.
 * @param map Called with each octet and its index.
 * @returns A new array of the same length.
 */
export function bytesMap(
	bytes: Uint8Array,
	map: (byte: number, index: number) => number,
): Uint8Array<ArrayBuffer> {
	const result = new Uint8Array(bytes.length);

	for (let index = 0; index < bytes.length; index++) {
		// Non-null: `index` runs over the source array's own length.
		result[index] = map(bytes[index]!, index) & 0xff;
	}

	return result;
}
