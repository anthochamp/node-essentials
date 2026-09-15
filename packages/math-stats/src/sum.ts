import { Callable, map, sumPrecise } from "@ac-kit/core";

/** How a total is accumulated. */
export type SumOptions = {
	/**
	 * Whether to accumulate exactly, so the total is the `number` nearest the
	 * true mathematical sum.
	 *
	 * Defaults to `true`. Turn it off only for a measured hot path whose terms
	 * share a sign and a magnitude — the case where a naive running total is
	 * already close to exact. Length alone is not a reason; see `sumPrecise`.
	 */
	exact?: boolean;
};

/**
 * Returns the sum of `fn(item)` over all items.
 *
 * @param iterable - The input iterable.
 * @param valueOf - Numeric extractor.
 * @param options - How to accumulate; exact by default.
 * @returns The total sum.
 */
export function sumBy<T>(
	iterable: Iterable<T>,
	valueOf: Callable<[T], number>,
	options?: SumOptions,
): number {
	if (options?.exact === false) {
		let total = 0;
		for (const item of iterable) {
			total += valueOf(item);
		}
		return total;
	}

	return sumPrecise(map(iterable, valueOf));
}

/**
 * Returns the sum of all items.
 *
 * @param iterable - The input iterable.
 * @param options - How to accumulate; exact by default.
 * @returns The total sum.
 */
export function sum(iterable: Iterable<number>, options?: SumOptions): number {
	return sumBy(iterable, (x) => x, options);
}
