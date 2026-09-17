/**
 * The successor and predecessor of a bound, for the operations that have to
 * name a point just outside an interval.
 *
 * Complementing or subtracting closed intervals cannot be done without one.
 * Removing `[3, 5]` from `[0, 10]` leaves everything up to but excluding 3 and
 * everything after but excluding 5, and a closed interval can only say that as
 * `[0, 2]` and `[6, 10]` — so the algorithm needs 2 from 3 and 6 from 5, which
 * no comparator can supply.
 *
 * That makes these operations meaningful **only over a discrete bound type**.
 * Over the reals the answer is genuinely not expressible as closed intervals,
 * and no `IntervalStep` can be written for them.
 *
 * A type with a step is also adjacency-aware, so a caller passing one here
 * usually wants `(end, next) => compare(step.next(end), next) === 0` as
 * `mergeIntervals`' `isAdjacent`.
 */
export type IntervalStep<T> = {
	/** The smallest value strictly greater than `value`. */
	next(value: T): T;
	/** The largest value strictly less than `value`. */
	previous(value: T): T;
};

/** `IntervalStep<number>` over the integers. */
export const INTEGER_INTERVAL_STEP: IntervalStep<number> = {
	next: (value) => value + 1,
	previous: (value) => value - 1,
};

/** `IntervalStep<bigint>` over the integers. */
export const BIG_INT_INTERVAL_STEP: IntervalStep<bigint> = {
	next: (value) => value + 1n,
	previous: (value) => value - 1n,
};
