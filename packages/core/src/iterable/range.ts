/**
 * Yields the arithmetic progression from `start` towards `stop`, exclusive.
 *
 * Stands in for TC39's `Iterator.range`, and follows it: `start` is required,
 * `stop` is exclusive, and a `stop` of `Infinity` (or `-Infinity` with a
 * negative `step`) yields forever. Nothing is materialised.
 *
 * Each value is computed as `start + step * index` rather than accumulated, so
 * a fractional `step` does not drift — `range(0, 1, 0.1)` ends at `0.9`, not at
 * `0.9999999999999999`.
 *
 * Time complexity: O(1) to construct, O(1) per value.
 *
 * @param start The first value, inclusive. Must be finite.
 * @param stop The bound to stop before, exclusive. May be infinite.
 * @param step How much to advance by. Must be finite and non-zero; a negative
 *   value counts down.
 * @returns An iterator over the progression. Empty when `stop` is already on
 *   the far side of `start`.
 * @throws {RangeError} If `start` is not finite, `stop` is `NaN`, or `step` is
 *   zero, `NaN` or infinite.
 */
export function* range(
	start: number,
	stop: number,
	step = 1,
): IterableIterator<number> {
	if (!Number.isFinite(start)) {
		throw new RangeError("range start must be finite");
	}
	if (Number.isNaN(stop)) {
		throw new RangeError("range stop must be a number");
	}
	if (!Number.isFinite(step) || step === 0) {
		throw new RangeError("range step must be finite and non-zero");
	}

	if (step > 0) {
		for (let index = 0; start + step * index < stop; index++) {
			yield start + step * index;
		}
	} else {
		for (let index = 0; start + step * index > stop; index++) {
			yield start + step * index;
		}
	}
}
