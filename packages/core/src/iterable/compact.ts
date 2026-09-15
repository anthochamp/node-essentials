/**
 * Removes null and undefined values from an iterable.
 *
 * @param array The input iterable.
 * @returns An iterator yielding only non-null and non-undefined values.
 */
export function* compact<T extends {}>(
	iterable: Iterable<T | null | undefined>,
): IterableIterator<T> {
	for (const item of iterable) {
		if (item !== null && item !== undefined) {
			yield item;
		}
	}
}
