import { Predicate } from "@ac-kit/core";

import { partitionInto } from "./_partition-into.js";

/**
 * Splits an iterable into two groups based on a predicate, in one pass.
 *
 * @param iterable - The input iterable.
 * @param predicate - Returns true for items going into the first group.
 * @returns A tuple `[matching, nonMatching]`.
 */
export function partition<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T]>,
): [T[], T[]] {
	return partitionInto(iterable, predicate, (item) => item);
}
