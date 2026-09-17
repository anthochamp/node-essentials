import type { Comparator } from "@ac-kit/core";

/**
 * Whether an interval ending at `end` and one starting at `nextStart` leave no
 * point between them, so the two cover a contiguous stretch despite sharing no
 * point.
 *
 * Only meaningful over a discrete bound type: `(end, next) => next === end + 1`
 * for integers, `(end, next) => next === end + 1n` for `bigint`.
 */
export type IntervalAdjacency<T> = (end: T, nextStart: T) => boolean;

/**
 * Sorts and coalesces intervals into the minimal set of disjoint, ascending,
 * inclusive ranges covering exactly the points the input covered.
 *
 * Intervals arrive and leave in the flat, stride-2 `[start, end, start, end,
 * …]` form the rest of `interval/` uses, so the result can be handed straight
 * to {@link isInSortedIntervals}.
 *
 * Two intervals coalesce when they overlap or touch at a point: `[1, 5]` and
 * `[5, 9]` become `[1, 9]`, because 5 is in both. **Touching and adjacent are
 * not the same question, and only the first is answered by default.** `[1, 2]`
 * and `[3, 4]` share no point, so whether they should still become `[1, 4]`
 * turns on whether anything lies strictly between 2 and 3 — over the integers
 * nothing does, over the reals 2.5 does, and over a `Date` it depends on
 * whether the caller is counting milliseconds or instants. The bound type alone
 * cannot settle it, so `isAdjacent` is how the caller says what the successor
 * of a bound is. Omit it and only overlaps merge.
 *
 * An interval whose start compares after its end covers no point and is
 * dropped: the result is the union of the inputs, and an empty interval
 * contributes nothing to a union.
 *
 * Complexity: O(n log n) in the interval count, dominated by the sort; O(n)
 * extra space. `isAdjacent`, when given, is called at most once per interval,
 * on already-sorted neighbours that do not overlap.
 *
 * @param intervals - Flat `[start, end, …]` pairs, in any order, possibly
 *   overlapping.
 * @param compare - Total order over the bound type.
 * @param isAdjacent - Successor test for a discrete bound type; omit for a
 *   dense one.
 * @returns A fresh flat array, ascending by start, holding no two intervals
 *   that overlap, touch, or satisfy `isAdjacent`.
 * @throws {RangeError} When `intervals` holds an odd number of bounds.
 */
export function mergeIntervals<T>(
	intervals: readonly T[],
	compare: Comparator<T>,
	isAdjacent?: IntervalAdjacency<T>,
): T[] {
	if (intervals.length % 2 !== 0) {
		throw new RangeError(
			`interval bounds come in pairs, got ${intervals.length}`,
		);
	}

	// Sort pair indices rather than the pairs themselves: no interval object is
	// ever materialised, which is the point of the flat form.
	const order: number[] = [];

	for (let pair = 0; pair * 2 < intervals.length; pair++) {
		// Non-null: the length is even, so both bounds of `pair` exist.
		if (compare(intervals[pair * 2]!, intervals[pair * 2 + 1]!) <= 0) {
			order.push(pair);
		}
	}

	order.sort((left, right) => {
		// Non-null: `order` holds pair indices that were bounds-checked above.
		const byStart = compare(intervals[left * 2]!, intervals[right * 2]!);

		return byStart !== 0
			? byStart
			: compare(intervals[left * 2 + 1]!, intervals[right * 2 + 1]!);
	});

	const merged: T[] = [];

	for (const pair of order) {
		// Non-null: as above.
		const start = intervals[pair * 2]!;
		const end = intervals[pair * 2 + 1]!;

		if (merged.length > 0) {
			// Non-null: a non-empty `merged` always ends on an interval's end bound.
			const previousEnd = merged[merged.length - 1]!;

			// Sorted by start, so `start` is at or after the previous start and the
			// only way the two can miss each other is by a gap after `previousEnd`.
			if (
				compare(start, previousEnd) <= 0 ||
				isAdjacent?.(previousEnd, start) === true
			) {
				if (compare(end, previousEnd) > 0) {
					merged[merged.length - 1] = end;
				}

				continue;
			}
		}

		merged.push(start, end);
	}

	return merged;
}
