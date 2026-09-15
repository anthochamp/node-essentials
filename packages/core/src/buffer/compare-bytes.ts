/**
 * Compares two `Uint8Array`s lexicographically by byte value.
 *
 * @param a The first array to compare.
 * @param b The second array to compare.
 * @returns A negative number if `a` sorts before `b`, positive if after, zero
 *   if equal. When one array is a prefix of the other, the shorter one sorts
 *   first.
 */
export function compareBytes(a: Uint8Array, b: Uint8Array): number {
	const len = Math.min(a.length, b.length);

	for (let index = 0; index < len; index++) {
		if (a[index] !== b[index]) {
			return a[index]! - b[index]!;
		}
	}

	return a.length - b.length;
}
