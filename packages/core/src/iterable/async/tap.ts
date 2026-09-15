import type { MaybeAsyncCallable } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields the elements unchanged, running `onItem` for each as it passes.
 *
 * The async counterpart of `tap`. An async `onItem` is awaited before the
 * element is yielded, so the side effect is ordered against the stream rather
 * than racing it.
 *
 * Time complexity: O(1) per element, plus whatever `onItem` costs.
 *
 * @param iterable The input iterable, sync or async.
 * @param onItem Receives each element and its zero-based index. Its resolved
 *   value is ignored.
 * @returns An iterator over the unchanged elements.
 */
export async function* tapAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	onItem: MaybeAsyncCallable<[T, number]>,
): AsyncIterableIterator<T> {
	let index = 0;

	for await (const item of iterable) {
		await onItem(item, index++);
		yield item;
	}
}
