import { POWERS_OF_TEN } from "../number/integer/_powers-of-ten.js";

// ---------------------------------------------------------------------------
// Lazy-expanded bigint table: 10^0 … up to 10^255 (populated on demand)
// ---------------------------------------------------------------------------
const bigPowersOf10_ = POWERS_OF_TEN.map(BigInt);

const BIG_POWERS_OF_10_MAX_EXPONENT_ = 255 as const;

/**
 * `10^exp` as a `bigint` for non-negative integer `exp`.
 *
 * Strategy:
 *
 * - `exp ∈ [0, 18]`: constant lookup in `_bigPowersOf10` (O(1))
 * - `exp ∈ [19, 255]`: lazy-expanded mutable table, populated on first access by
 *   multiplying the last entry by `10n`; expansion is idempotent (no locking
 *   needed in a single-threaded JS runtime)
 * - `exp > 255`: falls back to `10n ** BigInt(exp)` — no table entry
 *
 * @example
 * 	```ts
 * 	bigIntPow10(0); // → 1n
 * 	bigIntPow10(18); // → 1000000000000000000n
 * 	bigIntPow10(100); // → 10n**100n
 * 	```;
 */
export function bigIntPow10(exp: number): bigint {
	if (exp < bigPowersOf10_.length) {
		return bigPowersOf10_[exp] ?? 1n;
	}

	if (exp <= BIG_POWERS_OF_10_MAX_EXPONENT_) {
		// Expand lazily
		while (bigPowersOf10_.length <= exp) {
			const last = bigPowersOf10_[bigPowersOf10_.length - 1] ?? 1n;
			bigPowersOf10_.push(last * 10n);
		}
		return bigPowersOf10_[exp] ?? 1n;
	}

	return 10n ** BigInt(exp);
}
