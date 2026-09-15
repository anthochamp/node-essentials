import type { Comparator, OrderPredicate } from "./types.js";

/**
 * Adapts a {@link Comparator} into an {@link OrderPredicate}.
 *
 * Free — a single comparison call.
 */
export function createOrderPredicate<A, B = A>(
	compare: Comparator<A, B>,
): OrderPredicate<A, B> {
	return (a, b) => compare(a, b) < 0;
}
