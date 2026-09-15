import {
	type EqualityComparisonStrategy,
	resolveEqualityComparator,
} from "../../object/is-equal.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";
import { IS_ITERABLE_EQUAL_DEFAULT_COMPARISON_STRATEGY } from "../is-iterable-equal.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Checks whether two iterables yield equal elements in the same order, and the
 * same number of them.
 *
 * The async counterpart of `isIterableEqual`. Both sides are advanced
 * concurrently, so a round costs the slower source rather than their sum.
 * Short-circuits on the first difference, closing whichever iterator has not
 * ended.
 *
 * Time complexity: O(n) worst case.
 *
 * @param a The first iterable, sync or async.
 * @param b The second iterable, sync or async.
 * @param comparisonStrategy The equality comparison strategy to use (default is
 *   "strict"). Resolved once, not re-dispatched per element.
 * @param signal Aborts the comparison.
 * @returns `true` if both iterables yield the same elements in the same order.
 */
export async function isIterableEqualAsync<T>(
	a: MaybeAsyncIterable<T>,
	b: MaybeAsyncIterable<T>,
	comparisonStrategy: EqualityComparisonStrategy<
		T,
		T
	> = IS_ITERABLE_EQUAL_DEFAULT_COMPARISON_STRATEGY,
	signal?: AbortSignal,
): Promise<boolean> {
	signal?.throwIfAborted();

	const comparator = resolveEqualityComparator(comparisonStrategy);
	const iteratorA = asyncIteratorOf_(a);
	const iteratorB = asyncIteratorOf_(b);

	while (true) {
		const [resultA, resultB] = await Promise.all([
			iteratorA.next(),
			iteratorB.next(),
		]);

		signal?.throwIfAborted();

		if (resultA.done === true || resultB.done === true) {
			const bothDone = resultA.done === true && resultB.done === true;

			if (resultA.done !== true) {
				await iteratorA.return?.();
			}
			if (resultB.done !== true) {
				await iteratorB.return?.();
			}

			return bothDone;
		}

		if (!comparator(resultA.value, resultB.value)) {
			await Promise.all([iteratorA.return?.(), iteratorB.return?.()]);

			return false;
		}
	}
}
