import type { Callable } from "../../types/callable.js";
import { compareNaturalAscending } from "./compare-natural.js";
import type { Comparator, OrderPredicate } from "./types.js";

/**
 * Adapts an {@link OrderPredicate} into a {@link Comparator}.
 *
 * Costs two predicate calls per comparison to synthesise the equivalent case —
 * neither `a` precedes `b` nor `b` precedes `a`. Write a comparator directly
 * rather than deriving one for a hot loop.
 */
export function createComparator<T>(
	precedes: OrderPredicate<T>,
): Comparator<T> {
	return (a, b) => {
		if (precedes(a, b)) {
			return -1;
		}
		if (precedes(b, a)) {
			return 1;
		}
		return 0;
	};
}

/**
 * Builds a {@link Comparator} ordering items by one or more derived keys, each
 * in ascending natural order, earlier keys taking priority over later ones.
 *
 * Variadic rather than a `traits` object because the keys are homogeneous and
 * their order _is_ the priority; named fields would lose it.
 *
 * For a key that needs its own ordering — descending, or anything but natural —
 * compose instead: `createChainedComparator(createComparatorBy(keyOf),
 * createReversedComparator(createComparatorBy(otherKeyOf)))`.
 *
 * @param valueOfs Key accessors, in priority order. At least one is required.
 * @returns A comparator calling one accessor per operand per key, at worst.
 */
export function createComparatorBy<T>(
	...valueOfs: readonly [Callable<[T], unknown>, ...Callable<[T], unknown>[]]
): Comparator<T> {
	const [first, second] = valueOfs;

	if (valueOfs.length === 1) {
		return (a, b) => compareNaturalAscending(first(a), first(b));
	}
	if (valueOfs.length === 2) {
		return (a, b) =>
			compareNaturalAscending(first(a), first(b)) ||
			compareNaturalAscending(second!(a), second!(b));
	}

	return (a, b) => {
		for (let index = 0; index < valueOfs.length; index++) {
			const valueOf = valueOfs[index]!;
			const result = compareNaturalAscending(valueOf(a), valueOf(b));
			if (result !== 0) {
				return result;
			}
		}
		return 0;
	};
}
