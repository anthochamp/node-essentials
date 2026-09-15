import type { Callable } from "../types/callable.js";

/**
 * Yields the elements unchanged, running `onItem` for each as it passes.
 *
 * How a lazy pipeline is instrumented: the side effect runs when an element is
 * pulled, not when the pipeline is built, so nothing is observed that the
 * consumer did not ask for.
 *
 * Time complexity: O(1) per element, plus whatever `onItem` costs.
 *
 * @param iterable The input iterable.
 * @param onItem Receives each element and its zero-based index. Its return
 *   value is ignored.
 * @returns An iterator over the unchanged elements.
 */
export function* tap<T>(
	iterable: Iterable<T>,
	onItem: Callable<[T, number]>,
): IterableIterator<T> {
	let index = 0;

	for (const item of iterable) {
		onItem(item, index++);
		yield item;
	}
}
