import { bigIntAbs } from "@ac-kit/core";

import { bigIntGcd } from "./gcd.js";

/**
 * Whether `value` divides some power of `base` — equivalently, whether every
 * prime factor of `value` also divides `base`.
 *
 * This is what decides whether a fraction has a terminating expansion in a
 * given radix: `p/q` in lowest terms terminates in base `b` exactly when `q`
 * divides a power of `b`. In base 10 that is the familiar "denominators built
 * only from 2s and 5s" rule, and the same call answers it for any radix.
 *
 * No factorization is involved: dividing out `gcd(value, base)` repeatedly
 * strips exactly the primes shared with `base`, so whatever survives is a
 * factor `base` cannot supply.
 *
 * `1` divides `base ** 0`, so a unit always qualifies. `0` divides no power of
 * anything and never does.
 *
 * O(log value) gcd steps, each O(log² value) — the quotient loses at least one
 * bit per iteration.
 *
 * @param value The candidate divisor. Its sign is ignored.
 * @param base The base whose powers are tested. Its sign is ignored.
 * @returns `true` when `value` divides `base ** k` for some `k >= 0`.
 * @throws {RangeError} If `|base| < 2`, where the powers are `0` or `1` and the
 *   question is not about factorization at all.
 */
export function bigIntDividesPowerOf(value: bigint, base: bigint): boolean {
	const magnitude = bigIntAbs(base);

	if (magnitude < 2n) {
		throw new RangeError(
			`bigIntDividesPowerOf: base must have magnitude at least 2, got ${base}`,
		);
	}

	let remaining = bigIntAbs(value);

	if (remaining === 0n) {
		return false;
	}

	while (remaining !== 1n) {
		const shared = bigIntGcd(remaining, magnitude);

		if (shared === 1n) {
			return false;
		}

		do {
			remaining /= shared;
		} while (remaining % shared === 0n);
	}

	return true;
}
