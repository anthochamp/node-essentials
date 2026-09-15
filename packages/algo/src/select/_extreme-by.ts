import { Callable, Predicate } from "@ac-kit/core";

/**
 * The shared single-pass scan behind `minBy` and `maxBy`, parameterized only by
 * which of two projected values wins.
 *
 * `valueOf` is called exactly once per item rather than once per comparison,
 * which is the whole reason the accessor forms exist beside the comparator
 * ones.
 */
export function extremeBy_<T>(
	iterable: Iterable<T>,
	valueOf: Callable<[T], number>,
	isBetter: Predicate<[value: number, best: number]>,
): T | null {
	let best: T;
	let bestValue = 0;
	let hasBest = false;

	for (const item of iterable) {
		const value = valueOf(item);

		if (!hasBest || isBetter(value, bestValue)) {
			best = item;
			bestValue = value;
			hasBest = true;
		}
	}

	return hasBest ? best! : null;
}
