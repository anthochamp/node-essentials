/**
 * The binomial coefficient `C(n, k)` — the number of `k`-element subsets of an
 * `n`-element set.
 *
 * Computed by the multiplicative recurrence `C(n, k) = C(n, k−1) × (n − k + 1)
 * / k`, which stays within exact integer arithmetic at every step and never
 * forms the intermediate factorials.
 *
 * Uses the symmetry `C(n, k) = C(n, n − k)` so the loop runs `min(k, n − k)`
 * times.
 *
 * @param n - Size of the set, a non-negative integer.
 * @param k - Size of the subsets.
 * @returns `C(n, k)`, or `0` when `k` lies outside `[0, n]`.
 */
export function binomial(n: number, k: number): bigint {
	if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0) {
		throw new RangeError(
			`binomial: expected integers with n ≥ 0, got (${n}, ${k})`,
		);
	}
	if (k < 0 || k > n) {
		return 0n;
	}

	const upper = BigInt(n);
	const steps = BigInt(Math.min(k, n - k));

	let result = 1n;
	for (let i = 1n; i <= steps; i++) {
		result = (result * (upper - i + 1n)) / i;
	}
	return result;
}
