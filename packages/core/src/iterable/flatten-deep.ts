/**
 * An iterable whose elements are either `T` or another iterable of the same
 * shape, to any depth.
 */
export type NestedIterable<T> = Iterable<T | NestedIterable<T>>;

/**
 * Lazily flattens nested iterables to any depth.
 *
 * A `string` is never descended into, even though it is an `Iterable<string>` —
 * flattening `["ab", ["cd"]]` yields `"ab"` then `"cd"`, not six characters.
 * That is the case every deep-flatten gets wrong, and the reason this is not
 * just `flatten` applied repeatedly. Every other iterable is descended into,
 * including `Set`, `Map` and typed arrays.
 *
 * Depth is bounded by the call stack, so a structure that contains itself
 * overflows rather than yielding forever — the same way `Array.prototype.flat`
 * behaves.
 *
 * Time complexity: O(n) over the total number of leaves.
 *
 * @param iterable The nested iterable to flatten.
 * @returns An iterator over the leaves, in order.
 */
export function* flattenDeep<T>(
	iterable: NestedIterable<T>,
): IterableIterator<T> {
	for (const item of iterable) {
		if (isNestedIterable_(item)) {
			yield* flattenDeep(item);
		} else {
			yield item;
		}
	}
}

// `typeof === "object"` is what excludes `string`: it is iterable but primitive.
function isNestedIterable_<T>(
	item: T | NestedIterable<T>,
): item is NestedIterable<T> {
	return typeof item === "object" && item !== null && Symbol.iterator in item;
}
