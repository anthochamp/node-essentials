import type { DefinedValue } from "../types/defined-value.js";

/**
 * Returns the last element, or `undefined` when the iterable is empty.
 *
 * `T` cannot itself include `undefined`, so the absent case is never ambiguous.
 * Use `compact` first when the source may carry nullish elements.
 *
 * Time complexity: O(1) for an array, which is indexed directly; O(n) for any
 * other iterable, which has to be drained to reach its end.
 *
 * @param iterable The iterable to read from.
 * @returns The last element, or `undefined` if there is none.
 */
export function last<T extends DefinedValue>(
	iterable: Iterable<T>,
): T | undefined {
	if (Array.isArray(iterable)) {
		// Safe: `Array.isArray` widens the element type to `any`, losing the `T`
		// the parameter already guarantees.
		return (iterable as T[])[iterable.length - 1];
	}

	let result: T | undefined;

	for (const item of iterable) {
		result = item;
	}

	return result;
}
