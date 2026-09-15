import type { DefinedValue } from "../types/defined-value.js";

/**
 * Returns the first element, or `undefined` when the iterable is empty.
 *
 * `T` cannot itself include `undefined`, so the absent case is never ambiguous.
 * Use `compact` first when the source may carry nullish elements.
 *
 * Time complexity: O(1). The iterator is closed without being drained.
 *
 * @param iterable The iterable to read from.
 * @returns The first element, or `undefined` if there is none.
 */
export function first<T extends DefinedValue>(
	iterable: Iterable<T>,
): T | undefined {
	for (const item of iterable) {
		return item;
	}

	return undefined;
}
