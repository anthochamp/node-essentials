import {
	type Callable,
	type EqualityComparisonStrategy,
	FastSet,
} from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Yields the first item seen for each distinct `keyOf(item)`, in
 * first-occurrence order.
 *
 * Time complexity: O(n) under the default `"sameValueZero"`.
 *
 * @example
 * 	```ts
 * 	const array = [
 * 		{ id: 1, name: "Alice" },
 * 		{ id: 2, name: "Bob" },
 * 		{ id: 1, name: "Alice" },
 * 	];
 * 	[...uniqBy(array, (item) => item.id)];
 * 	// [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
 * 	```;
 *
 * @param iterable The input iterable.
 * @param keyOf A function that takes an item and returns a key.
 * @param comparisonStrategy The equality comparison strategy for keys.
 * @returns An iterator over the first item seen for each distinct key.
 */
export function* uniqBy<T, U>(
	iterable: Iterable<T>,
	keyOf: Callable<[T], U>,
	comparisonStrategy: EqualityComparisonStrategy<U, U> = "sameValueZero",
): IterableIterator<T> {
	if (comparisonStrategy === "sameValueZero") {
		const seen = new FastSet<U>();

		for (const item of iterable) {
			const key = keyOf(item);

			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness#same-value-zero_equality
			if (!seen.has(key)) {
				seen.add(key);
				yield item;
			}
		}
	} else {
		const seen = new EnhancedSet<U>(undefined, { comparisonStrategy });

		for (const item of iterable) {
			const key = keyOf(item);

			if (!seen.has(key)) {
				seen.add(key);
				yield item;
			}
		}
	}
}
