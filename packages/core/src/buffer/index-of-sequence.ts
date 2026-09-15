/**
 * Index of the first occurrence of `needle` in `haystack`, or `-1`.
 *
 * `Uint8Array.prototype.indexOf` only finds single bytes, so multi-byte
 * sequences (delimiters, magic numbers) need this.
 *
 * @param haystack - Bytes to search.
 * @param needle - Sequence to find. An empty needle matches at `from`.
 * @param from - Index to start searching at.
 * @returns The index of the first match, or `-1`.
 */
export function indexOfSequence(
	haystack: Uint8Array,
	needle: Uint8Array,
	from = 0,
): number {
	if (needle.length === 0) {
		return from;
	}

	const first = needle[0]!;
	const last = haystack.length - needle.length;

	outer: for (let start = from; start <= last; start++) {
		if (haystack[start] !== first) {
			continue;
		}

		for (let offset = 1; offset < needle.length; offset++) {
			if (haystack[start + offset] !== needle[offset]) {
				continue outer;
			}
		}

		return start;
	}

	return -1;
}
