import type { Comparator } from "@ac-kit/core";

/**
 * Every point both sets cover, as the same flat, stride-2 `[start, end, …]`
 * form.
 *
 * Both inputs must already be ascending and disjoint — run `mergeIntervals`
 * first if they are not. Needs no `IntervalStep`, unlike `complementIntervals`
 * and `subtractIntervals`: an intersection's bounds are always bounds one of
 * the inputs already named, so nothing has to be stepped past.
 *
 * Complexity: O(n + m) in the two interval counts, by a single merge walk.
 *
 * @param a - Flat `[start, end, …]` pairs, ascending and disjoint.
 * @param b - The same, and independent of `a`'s bounds.
 * @param compare - Total order over the bound type.
 * @returns A fresh flat array, ascending and disjoint. Inherits both inputs'
 *   non-adjacency: it can only narrow intervals, never bring two closer.
 * @throws {RangeError} When either input holds an odd number of bounds.
 */
export function intersectIntervals<T>(
	a: readonly T[],
	b: readonly T[],
	compare: Comparator<T>,
): T[] {
	if (a.length % 2 !== 0 || b.length % 2 !== 0) {
		throw new RangeError(
			`interval bounds come in pairs, got ${a.length} and ${b.length}`,
		);
	}

	const result: T[] = [];
	let indexA = 0;
	let indexB = 0;

	while (indexA < a.length && indexB < b.length) {
		// Non-null: both indices are below their array's even length.
		const endA = a[indexA + 1]!;
		const endB = b[indexB + 1]!;
		const startA = a[indexA]!;
		const startB = b[indexB]!;

		const start = compare(startA, startB) > 0 ? startA : startB;
		const end = compare(endA, endB) < 0 ? endA : endB;

		if (compare(start, end) <= 0) {
			result.push(start, end);
		}

		// Retire whichever interval ends first; the other may still meet the next
		// one on the opposite side.
		if (compare(endA, endB) < 0) {
			indexA += 2;
		} else {
			indexB += 2;
		}
	}

	return result;
}
