/**
 * Yields the arithmetic progression from `start` towards `stop`, exclusive,
 * over `bigint`.
 *
 * The `bigint` sibling of `range`, which TC39's `Iterator.range` also covers.
 * Values are accumulated rather than index-scaled, because `bigint` arithmetic
 * is exact and has nothing to drift.
 *
 * Time complexity: O(1) per value.
 *
 * @param start The first value, inclusive.
 * @param stop The bound to stop before, exclusive.
 * @param step How much to advance by. Must be non-zero; a negative value counts
 *   down.
 * @returns An iterator over the progression. Empty when `stop` is already on
 *   the far side of `start`.
 * @throws {RangeError} If `step` is zero.
 */
export function* bigIntRange(
	start: bigint,
	stop: bigint,
	step = 1n,
): IterableIterator<bigint> {
	if (step === 0n) {
		throw new RangeError("bigIntRange step must be non-zero");
	}

	if (step > 0n) {
		for (let value = start; value < stop; value += step) {
			yield value;
		}
	} else {
		for (let value = start; value > stop; value += step) {
			yield value;
		}
	}
}
