/**
 * Largest argument whose factorial is kept.
 *
 * `256!` is about 507 digits, so the whole table costs a few tens of kilobytes
 * at most. The cap is what stops a single call with a large argument from
 * pinning every intermediate factorial below it in memory for the process's
 * lifetime.
 */
const MAX_CACHED_ = 256;

/** Factorials `0!` upward, extended on demand and never recomputed. */
const cache_: bigint[] = [1n];

/**
 * The factorial `n! = 1 × 2 × … × n`, with `0! = 1`.
 *
 * Returns a `bigint` because `21!` already exceeds `Number.MAX_SAFE_INTEGER`.
 *
 * Amortised O(1) for repeated calls at or below 256, which is where the
 * consumers sit: the table is extended only as far as it has not already
 * reached. Above that the tail is multiplied out each time rather than stored.
 *
 * @param n - A non-negative integer.
 * @returns `n!` as an exact integer.
 */
export function factorial(n: number): bigint {
	if (!Number.isInteger(n) || n < 0) {
		throw new RangeError(
			`factorial: expected a non-negative integer, got ${n}`,
		);
	}

	const cached = Math.min(n, MAX_CACHED_);
	for (let index = cache_.length; index <= cached; index++) {
		cache_[index] = cache_[index - 1]! * BigInt(index);
	}

	let result = cache_[cached]!;
	for (let index = cached + 1; index <= n; index++) {
		result *= BigInt(index);
	}

	return result;
}
