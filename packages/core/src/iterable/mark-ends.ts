/** An element together with whether it is the first and whether it is the last. */
export type MarkedEnd<T> = [item: T, isFirst: boolean, isLast: boolean];

/**
 * Yields each element tagged with whether it is the first and whether it is the
 * last.
 *
 * What every formatter needs to decide where separators, indentation or box
 * corners go, and the reason it is worth having: knowing an element is the last
 * one requires a one-element lookahead, so the source always runs one step
 * ahead of what has been yielded.
 *
 * A lone element is both first and last.
 *
 * Time complexity: O(1) per element, allocating one tuple per yield.
 *
 * @param iterable The input iterable.
 * @returns An iterator over the tagged elements.
 */
export function* markEnds<T>(
	iterable: Iterable<T>,
): IterableIterator<MarkedEnd<T>> {
	const iterator = iterable[Symbol.iterator]();
	let current = iterator.next();

	if (current.done === true) {
		return;
	}

	let isFirst = true;

	while (true) {
		const next = iterator.next();

		yield [current.value, isFirst, next.done === true];

		if (next.done === true) {
			return;
		}

		current = next;
		isFirst = false;
	}
}
