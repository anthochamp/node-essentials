import type { MaybeAsyncPredicate } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Splits an iterable at the first element failing `predicate`, returning the
 * prefix and the remainder as two iterators over the same source.
 *
 * The async counterpart of `beforeAndAfter`. The two share one underlying
 * iterator, so **the first must be consumed before the second**. Reading the
 * second early drains the first silently; abandoning the first part-way makes
 * the second resume from wherever the source was left, with no boundary
 * element.
 *
 * Time complexity: O(1) per element. Memory: O(1).
 *
 * @param iterable The input iterable, sync or async.
 * @param predicate Receives each element and its zero-based index.
 * @returns The leading elements that satisfy `predicate`, then the rest
 *   starting at the first that does not.
 */
export function beforeAndAfterAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	predicate: MaybeAsyncPredicate<[T, number]>,
): [before: AsyncIterableIterator<T>, after: AsyncIterableIterator<T>] {
	const iterator = asyncIteratorOf_(iterable);
	let boundary: IteratorResult<T> | undefined;

	async function* before(): AsyncIterableIterator<T> {
		let index = 0;

		while (boundary === undefined) {
			const result = await iterator.next();

			if (result.done === true || !(await predicate(result.value, index++))) {
				boundary = result;
				return;
			}

			yield result.value;
		}
	}

	const beforeIterator = before();

	async function* after(): AsyncIterableIterator<T> {
		// A `before` abandoned early closes without reaching the split, so stop
		// draining when it reports done rather than waiting for a boundary.
		while (boundary === undefined) {
			if ((await beforeIterator.next()).done === true) {
				break;
			}
		}

		if (boundary !== undefined && boundary.done !== true) {
			yield boundary.value;
		}

		while (true) {
			const result = await iterator.next();

			if (result.done === true) {
				return;
			}

			yield result.value;
		}
	}

	return [beforeIterator, after()];
}
