/**
 * An iterable whose elements are either `T` or another iterable of the same
 * shape, to any depth, sync or async at every level.
 *
 * Written as an explicit union rather than through `MaybeAsyncIterable` so the
 * recursion sits under an interface, which is what lets TypeScript defer it.
 */
export type NestedAsyncIterable<T> =
	| Iterable<T | NestedAsyncIterable<T>>
	| AsyncIterable<T | NestedAsyncIterable<T>>;

/**
 * Lazily flattens nested iterables to any depth.
 *
 * The async counterpart of `flattenDeep`, and it shares the rule that matters:
 * a `string` is never descended into, even though it is iterable.
 *
 * Time complexity: O(n) over the total number of leaves.
 *
 * @param iterable The nested iterable to flatten.
 * @returns An iterator over the leaves, in order.
 */
export async function* flattenDeepAsync<T>(
	iterable: NestedAsyncIterable<T>,
): AsyncIterableIterator<T> {
	for await (const item of iterable) {
		if (isNestedAsyncIterable_(item)) {
			yield* flattenDeepAsync(item);
		} else {
			yield item;
		}
	}
}

// `typeof === "object"` is what excludes `string`: it is iterable but primitive.
function isNestedAsyncIterable_<T>(
	item: T | NestedAsyncIterable<T>,
): item is NestedAsyncIterable<T> {
	return (
		typeof item === "object" &&
		item !== null &&
		(Symbol.iterator in item || Symbol.asyncIterator in item)
	);
}
