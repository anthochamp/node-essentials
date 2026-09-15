import type { EqualityComparator } from "../../object/is-equal.js";
import type { Comparator } from "./types.js";

/**
 * Adapts a {@link Comparator} into an {@link EqualityComparator}, treating
 * equivalent operands as equal.
 *
 * Only this direction is derivable: an equality answers one bit and says
 * nothing about which operand comes first, so no comparator can be recovered
 * from one.
 *
 * The result is transitive only because the comparator is exact — deriving one
 * from an approximate comparison would produce an "equality" unusable as a set
 * or map key.
 */
export function createEqualityComparator<A, B = A>(
	compare: Comparator<A, B>,
): EqualityComparator<A, B> {
	return (a, b) => compare(a, b) === 0;
}
