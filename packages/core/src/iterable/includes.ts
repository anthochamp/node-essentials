import { EqualityComparator, isEqual } from "../object/is-equal.js";

/**
 * Checks whether `item` occurs in `iterable`.
 *
 * Named for the semantics it implements: `sameValueZero` by default, which is
 * what `Array.prototype.includes` and `Set.prototype.has` both use, and unlike
 * `indexOf` it finds `NaN`.
 *
 * Time complexity: O(n), short-circuiting on the first match.
 *
 * @param iterable The iterable to search.
 * @param item The item to search for.
 * @param comparator The equality comparison function to use (default is
 *   `isEqual` with "sameValueZero" strategy, the same as
 *   `Array.prototype.includes`).
 * @returns `true` if a matching item was found, `false` otherwise.
 */
export function includes<T>(
	iterable: Iterable<T>,
	item: T,
	comparator: EqualityComparator<T, T> = (a, b) =>
		isEqual(a, b, "sameValueZero"),
): boolean {
	for (const candidate of iterable) {
		if (comparator(candidate, item)) {
			return true;
		}
	}

	return false;
}
