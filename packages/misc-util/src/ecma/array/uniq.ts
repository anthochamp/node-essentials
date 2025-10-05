import type { Predicate } from "../function/types.js";
import { type IsEqualWellKnownStrategy, isEqual } from "../object/is-equal.js";

/**
 * Removes duplicate values from an array using the specified equality
 * comparison strategy.
 *
 * @param array The input array.
 * @param strategy The equality comparison strategy to use (default is "sameValueZero").
 * @returns A new array with duplicate values removed.
 */
export function uniq<T>(
	array: T[],
	strategy: IsEqualWellKnownStrategy | Predicate<[T, T]> = "sameValueZero",
): T[] {
	if (strategy === "sameValueZero") {
		return Array.from(new Set(array));
	}

	return array.filter((item, index) => {
		for (let i = 0; i < index; i++) {
			// biome-ignore lint/style/noNonNullAssertion: indexed loop
			if (isEqual(item, array[i]!, strategy)) {
				return false;
			}
		}
		return true;
	});
}
