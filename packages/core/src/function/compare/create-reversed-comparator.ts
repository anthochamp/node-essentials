import type { Comparator } from "./types.js";

/** Reverses `compare`; operands it calls equivalent stay equivalent. */
export function createReversedComparator<A, B = A>(
	compare: Comparator<A, B>,
): Comparator<B, A> {
	return (a, b) => compare(b, a);
}
