import type { Comparator } from "./types.js";

/**
 * Chains comparators, each breaking the ties left by the one before it.
 *
 * Variadic rather than a `traits` object because the comparators are
 * homogeneous and their order _is_ the priority; named fields would lose it.
 *
 * @param compares Comparators in priority order. At least one is required.
 * @returns A comparator calling as few of them as the first difference allows.
 */
export function createChainedComparator<A, B = A>(
	...compares: readonly [Comparator<A, B>, ...Comparator<A, B>[]]
): Comparator<A, B> {
	const [first, second] = compares;

	if (compares.length === 1) {
		return first;
	}
	if (compares.length === 2) {
		return (a, b) => first(a, b) || second!(a, b);
	}

	return (a, b) => {
		for (let index = 0; index < compares.length; index++) {
			const result = compares[index]!(a, b);
			if (result !== 0) {
				return result;
			}
		}
		return 0;
	};
}
