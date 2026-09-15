import { Callable } from "@ac-kit/core";

import { extremeBy_ } from "./_extreme-by.js";

/**
 * Returns the item with the largest `valueOf(item)`, or `null` if the iterable
 * is empty. Ties resolve to the first item seen.
 *
 * Time complexity: O(n), with one `valueOf` call per item.
 *
 * @param iterable - The input iterable.
 * @param valueOf - Numeric key extractor.
 * @returns The maximum item, or `null` for an empty iterable.
 */
export function maxBy<T>(
	iterable: Iterable<T>,
	valueOf: Callable<[T], number>,
): T | null {
	return extremeBy_(iterable, valueOf, (value, best) => value > best);
}
