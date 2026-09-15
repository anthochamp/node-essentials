import { type EqualityComparator, isEqual } from "../../object/is-equal.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Checks whether `item` occurs in `iterable`.
 *
 * The async counterpart of `includes`.
 *
 * Time complexity: O(n), short-circuiting on the first match.
 *
 * @param iterable The iterable to search, sync or async.
 * @param item The item to search for.
 * @param comparator The equality comparison function to use (default is
 *   `isEqual` with "sameValueZero" strategy).
 * @param signal Aborts the search.
 * @returns `true` if a matching item was found, `false` otherwise.
 */
export async function includesAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	item: T,
	comparator: EqualityComparator<T, T> = (a, b) =>
		isEqual(a, b, "sameValueZero"),
	signal?: AbortSignal,
): Promise<boolean> {
	signal?.throwIfAborted();

	for await (const candidate of iterable) {
		signal?.throwIfAborted();

		if (comparator(candidate, item)) {
			return true;
		}
	}

	return false;
}
