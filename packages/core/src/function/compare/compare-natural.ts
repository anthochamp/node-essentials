import type { ComparatorResult } from "./types.js";

/**
 * Ascending natural order, using the `<` and `>` operators.
 *
 * Exact — no tolerance of any kind. Two `number`s compare equivalent only when
 * `===` says so, which is what keeps this a strict weak ordering; an
 * approximate comparison is not transitive and would corrupt every sort, bisect
 * and heap it reached. Use {@link isCloseTo} for approximate tests, and never
 * as a comparator.
 *
 * `NaN` sorts after every other value and is equivalent to itself, so the
 * ordering stays total. `-0` and `+0` are equivalent, matching `===` and
 * therefore agreeing with exact equality — deliberately unlike
 * `%TypedArray%.prototype.sort`, which orders `-0` before `+0` and so cannot
 * agree with an `===`-based equality.
 */
export function compareNaturalAscending<T>(a: T, b: T): ComparatorResult {
	if (a < b) {
		return -1;
	}
	if (a > b) {
		return 1;
	}

	// Only reachable when equivalent or NaN is involved, so the self-comparison
	// never costs anything on the ordered path.
	if (a !== a) {
		return b !== b ? 0 : 1;
	}
	if (b !== b) {
		return -1;
	}
	return 0;
}

/** Descending natural order — the reverse of {@link compareNaturalAscending}. */
export function compareNaturalDescending<T>(a: T, b: T): ComparatorResult {
	return compareNaturalAscending(b, a);
}
