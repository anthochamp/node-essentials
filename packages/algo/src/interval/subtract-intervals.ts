import type { Comparator } from "@ac-kit/core";

import type { IntervalStep } from "./interval-step.js";

/**
 * What remains of `a` once every point of `b` is removed, as the same flat,
 * stride-2 `[start, end, …]` form.
 *
 * How a firewall carves an exception out of an allowlist: exact in both
 * directions, so no point of `b` survives and no point of `a` is lost.
 *
 * Both inputs must already be ascending and disjoint — run `mergeIntervals`
 * first if they are not.
 *
 * Complexity: O(n + m) amortised in the two interval counts. Each hole is
 * revisited only while it still overlaps the interval under consideration, and
 * a hole that ends before the current interval starts is retired for good.
 *
 * @param a - Flat `[start, end, …]` pairs, ascending and disjoint.
 * @param b - The holes to remove, ascending and disjoint.
 * @param compare - Total order over the bound type.
 * @param step - Successor and predecessor; removing `[3, 5]` leaves a piece
 *   ending at 2 and one resuming at 6, and only `step` knows those.
 * @returns A fresh flat array, ascending and disjoint. Inherits `a`'s
 *   non-adjacency: two surviving pieces are always separated by a removed
 *   point.
 * @throws {RangeError} When either input holds an odd number of bounds.
 */
export function subtractIntervals<T>(
	a: readonly T[],
	b: readonly T[],
	compare: Comparator<T>,
	step: IntervalStep<T>,
): T[] {
	if (a.length % 2 !== 0 || b.length % 2 !== 0) {
		throw new RangeError(
			`interval bounds come in pairs, got ${a.length} and ${b.length}`,
		);
	}

	const result: T[] = [];
	let firstLiveHole = 0;

	for (let index = 0; index < a.length; index += 2) {
		// Non-null: the length is even, so both bounds of the pair exist.
		const end = a[index + 1]!;
		let cursor: T = a[index]!;
		let consumed = false;

		// `a` ascends, so a hole ending before this interval starts cannot reach
		// any later one either.
		while (
			firstLiveHole < b.length &&
			compare(b[firstLiveHole + 1]!, cursor) < 0
		) {
			firstLiveHole += 2;
		}

		for (let hole = firstLiveHole; hole < b.length; hole += 2) {
			// Non-null: as above.
			const holeStart = b[hole]!;
			const holeEnd = b[hole + 1]!;

			if (compare(holeStart, end) > 0) {
				break;
			}

			if (compare(holeStart, cursor) > 0) {
				result.push(cursor, step.previous(holeStart));
			}

			// `step.next` is only ever reached below `end`, so it cannot be asked
			// for a successor the bound type has no room for.
			if (compare(holeEnd, end) >= 0) {
				consumed = true;
				break;
			}

			cursor = step.next(holeEnd);
		}

		if (!consumed && compare(cursor, end) <= 0) {
			result.push(cursor, end);
		}
	}

	return result;
}
