/**
 * Drains an iterable without materialising it, for a pipeline whose side
 * effects are the point.
 *
 * The readable form of an empty-bodied `for…of`, which reads like a mistake.
 * The iterator is closed when a `count` cuts the drain short.
 *
 * Time complexity: O(min(n, count)). Memory: O(1).
 *
 * @param iterable The iterable to drain.
 * @param count How many elements to pull. Must be a non-negative integer or
 *   `Infinity`, the default, which drains to the end.
 * @throws {RangeError} If `count` is negative, fractional or `NaN`.
 */
export function consume(
	iterable: Iterable<unknown>,
	count: number = Number.POSITIVE_INFINITY,
): void {
	if (
		count !== Number.POSITIVE_INFINITY &&
		(!Number.isInteger(count) || count < 0)
	) {
		throw new RangeError(
			"consume count must be a non-negative integer or Infinity",
		);
	}

	const iterator = iterable[Symbol.iterator]();

	for (let drained = 0; drained < count; drained++) {
		if (iterator.next().done === true) {
			return;
		}
	}

	iterator.return?.();
}
