import type { MaybeAsyncPredicate } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";
import { dropWhileAsync } from "./drop-while.js";

/**
 * Yields the elements with any trailing run satisfying `predicate` removed.
 *
 * The async counterpart of `trimEndWhile`. An element is only known to be
 * trailing once something that fails `predicate` follows it, so a run of
 * candidates is held back until then.
 *
 * Time complexity: O(n). Memory: O(longest matching run).
 *
 * @param iterable The input iterable, sync or async.
 * @param predicate Decides whether an element may be trimmed.
 * @returns An iterator over the elements, trailing matches removed.
 */
export async function* trimEndWhileAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	predicate: MaybeAsyncPredicate<[T]>,
): AsyncIterableIterator<T> {
	const pending: T[] = [];

	for await (const item of iterable) {
		if (await predicate(item)) {
			pending.push(item);
			continue;
		}

		yield* pending;
		pending.length = 0;
		yield item;
	}
}

/**
 * Yields the elements with any leading _and_ trailing run satisfying
 * `predicate` removed.
 *
 * The async counterpart of `trimWhile`. The start-only case is
 * `dropWhileAsync`, which this composes rather than duplicating.
 *
 * Time complexity: O(n). Memory: O(longest matching run).
 *
 * @param iterable The input iterable, sync or async.
 * @param predicate Decides whether an element may be trimmed.
 * @returns An iterator over the elements, leading and trailing matches removed.
 */
export function trimWhileAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	predicate: MaybeAsyncPredicate<[T]>,
): AsyncIterableIterator<T> {
	return trimEndWhileAsync(
		dropWhileAsync(iterable, async (item) => predicate(item)),
		predicate,
	);
}
