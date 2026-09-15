import {
	type EqualityComparisonStrategy,
	resolveEqualityComparator,
} from "../object/is-equal.js";

export const IS_ITERABLE_EQUAL_DEFAULT_COMPARISON_STRATEGY: EqualityComparisonStrategy =
	"strict";

/**
 * Checks whether two iterables yield equal elements in the same order, and the
 * same number of them.
 *
 * Short-circuits on the first difference, and closes whichever iterator has not
 * ended when it does. The comparison is exact: a tolerant predicate is not a
 * valid equality, so pass one only where intransitivity is acceptable.
 *
 * Time complexity: O(n) worst case, O(1) when both are arrays of differing
 * length.
 *
 * @param a The first iterable.
 * @param b The second iterable.
 * @param comparisonStrategy The equality comparison strategy to use (default is
 *   "strict"). Resolved once, not re-dispatched per element.
 * @returns `true` if both iterables yield the same elements in the same order.
 */
export function isIterableEqual<T>(
	a: Iterable<T>,
	b: Iterable<T>,
	comparisonStrategy: EqualityComparisonStrategy<
		T,
		T
	> = IS_ITERABLE_EQUAL_DEFAULT_COMPARISON_STRATEGY,
): boolean {
	if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) {
		return false;
	}

	const comparator = resolveEqualityComparator(comparisonStrategy);
	const iteratorA = a[Symbol.iterator]();
	const iteratorB = b[Symbol.iterator]();

	while (true) {
		const resultA = iteratorA.next();
		const resultB = iteratorB.next();

		if (resultA.done === true || resultB.done === true) {
			if (resultA.done !== true) {
				iteratorA.return?.();
			}
			if (resultB.done !== true) {
				iteratorB.return?.();
			}

			return resultA.done === true && resultB.done === true;
		}

		if (!comparator(resultA.value, resultB.value)) {
			iteratorA.return?.();
			iteratorB.return?.();

			return false;
		}
	}
}
