import type { Comparator } from "@ac-kit/core";

import type { IntervalStep } from "./interval-step.js";

/**
 * The gaps: every point of `bounds` that none of `intervals` covers, as the
 * same flat, stride-2 `[start, end, …]` form.
 *
 * Free slots between the meetings in a calendar, the lines a coverage report
 * never reached, the holes in an allocation map. Anything outside `bounds` is
 * ignored rather than reported, since "everything not covered" has no answer
 * over an unbounded domain.
 *
 * `intervals` must already be ascending and disjoint — run `mergeIntervals`
 * first if it is not. Its bounds may lie outside `bounds`; the parts that do
 * are clipped.
 *
 * Complexity: O(n) in the interval count, O(n) extra space.
 *
 * @param intervals - Flat `[start, end, …]` pairs, ascending and disjoint.
 * @param bounds - The inclusive window to report gaps within.
 * @param compare - Total order over the bound type.
 * @param step - Successor and predecessor; the gap beside `[3, 5]` ends at 2
 *   and resumes at 6, and only `step` knows that.
 * @returns A fresh flat array, ascending, disjoint, and covering exactly
 *   `bounds` minus `intervals`. Empty when `intervals` covers all of `bounds`
 *   or when `bounds` is itself empty.
 * @throws {RangeError} When `intervals` holds an odd number of bounds.
 */
export function complementIntervals<T>(
	intervals: readonly T[],
	bounds: readonly [T, T],
	compare: Comparator<T>,
	step: IntervalStep<T>,
): T[] {
	if (intervals.length % 2 !== 0) {
		throw new RangeError(
			`interval bounds come in pairs, got ${intervals.length}`,
		);
	}

	const [low, high] = bounds;

	if (compare(low, high) > 0) {
		return [];
	}

	const gaps: T[] = [];
	// The first point not yet known to be covered.
	let cursor = low;

	for (let index = 0; index < intervals.length; index += 2) {
		// Non-null: the length is even, so both bounds of the pair exist.
		const start = intervals[index]!;
		const end = intervals[index + 1]!;

		if (compare(end, cursor) < 0) {
			continue;
		}

		if (compare(start, high) > 0) {
			break;
		}

		if (compare(start, cursor) > 0) {
			gaps.push(cursor, step.previous(start));
		}

		// `step.next` is only ever reached below `high`, so it cannot be asked for
		// a successor the bound type has no room for.
		if (compare(end, high) >= 0) {
			return gaps;
		}

		cursor = step.next(end);
	}

	if (compare(cursor, high) <= 0) {
		gaps.push(cursor, high);
	}

	return gaps;
}
