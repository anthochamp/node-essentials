import { type EqualityComparisonStrategy } from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Computes the intersection of any number of iterables.
 *
 * Time complexity: O(n) total across every source iterable — one `Set` is built
 * per iterable after the first, and the running result is filtered against it,
 * rather than re-scanning an array per candidate (which would make this
 * quadratic). That holds under the default `"sameValueZero"`.
 *
 * @param iterables The iterables to intersect.
 * @param comparisonStrategy The equality comparison strategy to use.
 * @returns An iterable containing only the elements common to every input
 *   iterable.
 */
export function intersection<T>(
	iterables: readonly Iterable<T>[],
	comparisonStrategy: EqualityComparisonStrategy<T, T> = "sameValueZero",
): Iterable<T> {
	const [first, ...rest] = iterables;

	if (first === undefined) {
		return new Set<T>();
	}

	if (comparisonStrategy === "sameValueZero") {
		let result = new Set<T>(first);

		for (const iterable of rest) {
			// Short-circuit if the running intersection is empty.
			if (result.size === 0) {
				break;
			}

			const lookup = new Set(iterable);
			result = result.intersection(lookup);
		}

		return result;
	}

	let result = new EnhancedSet<T>(first, { comparisonStrategy });

	for (const iterable of rest) {
		// Short-circuit if the running intersection is empty.
		if (result.count() === 0) {
			break;
		}

		const lookup = new EnhancedSet<T>(iterable, { comparisonStrategy });
		result = result.intersection(lookup);
	}

	return result;
}
