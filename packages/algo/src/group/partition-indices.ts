import { Predicate } from "@ac-kit/core";

import { partitionInto } from "./_partition-into.js";

/**
 * {@link partition} reporting positions instead of elements — the single-pass
 * equivalent of the `map`/`filter`/`map` chain for index extraction.
 *
 * @param iterable - The input iterable.
 * @param predicate - Returns true for indices going into the first group.
 * @returns A tuple `[matchingIndices, nonMatchingIndices]`.
 */
export function partitionIndices<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T]>,
): [number[], number[]] {
	return partitionInto(iterable, predicate, (_item, index) => index);
}
