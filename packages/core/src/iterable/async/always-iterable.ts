import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Normalises "one item or many" into an async iterable, at a boundary where a
 * caller may pass either.
 *
 * The async counterpart of `alwaysIterable`, and it keeps the rule that
 * matters: a `string` is treated as a single item, never as a sequence of
 * characters.
 *
 * Time complexity: O(1).
 *
 * @param value A single item, or an iterable of them, sync or async.
 * @returns An async iterable over `value`'s elements when it is a non-string
 *   iterable, otherwise over `value` alone.
 */
export async function* alwaysIterableAsync<T>(
	value: T | MaybeAsyncIterable<T>,
): AsyncIterableIterator<T> {
	// `typeof === "object"` is what excludes `string`: it is iterable but
	// primitive.
	if (
		typeof value === "object" &&
		value !== null &&
		(Symbol.iterator in value || Symbol.asyncIterator in value)
	) {
		yield* value as MaybeAsyncIterable<T>;
		return;
	}

	yield value as T;
}
