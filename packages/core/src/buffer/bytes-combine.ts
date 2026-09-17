import { bytesMap } from "./bytes-map.js";

/**
 * Applies `combine` to each octet pair of two equal-length arrays.
 *
 * The result of `combine` is masked to one octet. Pairing stops at the shorter
 * array only when lengths are allowed to differ, which they are not here: a
 * bitwise operation over mismatched widths has no meaning, so it throws rather
 * than silently truncating.
 *
 * Complexity: O(n) time and O(n) memory in the input length.
 *
 * @param a The left octets.
 * @param b The right octets.
 * @param combine Called with each octet pair and its index.
 * @returns A new array of the same length.
 * @throws RangeError When the two arrays differ in length.
 */
export function bytesCombine(
	a: Uint8Array,
	b: Uint8Array,
	combine: (left: number, right: number, index: number) => number,
): Uint8Array<ArrayBuffer> {
	if (a.length !== b.length) {
		throw new RangeError(
			`cannot combine ${a.length} octets with ${b.length} octets`,
		);
	}

	// Non-null: `index` runs over `a`'s length, and `b` has been checked equal.
	return bytesMap(a, (byte, index) => combine(byte, b[index]!, index));
}
