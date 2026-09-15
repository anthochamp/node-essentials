import type { Comparator } from "@ac-kit/core";

import { binarySearch } from "../ordered/_binary-search.js";

/**
 * Tests whether `value` falls within any of the given sorted, disjoint ranges,
 * each represented as a pair of inclusive bounds in a flat array.
 *
 * Finds the candidate range the same way `bisectRight` finds an insertion point
 * (rightmost range whose start is at or before `value`), then checks `value`
 * against that range's end.
 *
 * Complexity: O(log n) in the number of ranges (`ranges.length / 2`).
 *
 * @param ranges - Flat, sorted, non-overlapping `[start, end, ...]` pairs.
 * @param value - The value to test for membership.
 * @param compare - Total order between two `T` values.
 */
export function isInSortedIntervals<T>(
	ranges: readonly T[],
	value: T,
	compare: Comparator<T>,
): boolean {
	const rangeCount = ranges.length / 2;

	const candidate =
		binarySearch(
			0,
			rangeCount,
			(index) => compare(ranges[index * 2]!, value) <= 0,
		) - 1;

	return candidate >= 0 && compare(value, ranges[candidate * 2 + 1]!) <= 0;
}
