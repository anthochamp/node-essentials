import { bigIntBitLength } from "./bit-length.js";
import { bigIntPow10 } from "./pow10.js";

// ---------------------------------------------------------------------------
// Constant: ⌊2^63 / log₂(10)⌋
// Used to convert bit-length to a decimal-digit approximation in O(1).
// ---------------------------------------------------------------------------
const ONE_OVER_LOG2_TEN_ = 2_776_511_644_261_678_566n as const;
const ONE_OVER_LOG2_TEN_SHIFT_ = 63n as const;

/**
 * Floor of log₁₀ for a **positive `bigint`**.
 *
 * Algorithm (O(log log n)):
 *
 * 1. Compute the bit length of `n`.
 * 2. Approximate `t = ⌊bitLength × kOneOverLog2Ten / 2^63⌋`.
 * 3. Correct by +1 if `n >= 10^(t+1)`.
 *
 * @example
 * 	```ts
 * 	bigIntLog10(1n); // → 0
 * 	bigIntLog10(10n); // → 1
 * 	bigIntLog10(10n ** 38n - 1n); // → 37
 * 	bigIntLog10(10n ** 38n); // → 38
 * 	```;
 *
 * @param n - Must satisfy `n >= 1n`; negative / zero input is undefined.
 * @returns Floor of log₁₀(n) as a `number`.
 */
export function bigIntLog10(n: bigint): number {
	const bitLen = BigInt(bigIntBitLength(n));

	// Approximate: t ≈ ⌊bitLen / log₂(10)⌋
	const approx = Number(
		(bitLen * ONE_OVER_LOG2_TEN_) >> ONE_OVER_LOG2_TEN_SHIFT_,
	);

	// Correct off-by-one: the approximation may be 1 too large or 1 too small
	if (n < bigIntPow10(approx)) {
		return approx - 1;
	}

	if (n >= bigIntPow10(approx + 1)) {
		return approx + 1;
	}

	return approx;
}
