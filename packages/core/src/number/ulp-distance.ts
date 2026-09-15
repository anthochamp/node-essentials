import { float64ToBits } from "./float64-bits.js";

const SIGN_BIT_ = 1n << 63n;
const MAGNITUDE_MASK_ = SIGN_BIT_ - 1n;

/**
 * Maps `value` onto a signed key ordered the same way the float is, so
 * subtracting two keys counts the representable values between them.
 *
 * Sign-magnitude rather than the usual unsigned bias: it collapses `-0` and
 * `+0` onto the same key, where any mapping that keeps their bit patterns apart
 * leaves a vacant slot and reports one extra step across zero.
 */
function orderedKey_(value: number): bigint {
	const bits = float64ToBits(value);
	const magnitude = bits & MAGNITUDE_MASK_;

	return bits & SIGN_BIT_ ? -magnitude : magnitude;
}

/**
 * Number of representable binary64 values between `a` and `b` — `0` when they
 * are equal, `1` when they are adjacent.
 *
 * The raw count {@link isCloseUlp} thresholds. `±0` count as equal, matching
 * `===`.
 *
 * @returns The ULP distance, or `Number.NaN` when either input is `NaN`. The
 *   count is exact up to `Number.MAX_SAFE_INTEGER`, which only values nowhere
 *   near each other can exceed.
 */
export function ulpDistance(a: number, b: number): number {
	if (Number.isNaN(a) || Number.isNaN(b)) {
		return Number.NaN;
	}

	if (a === b) {
		return 0;
	}

	const keyA = orderedKey_(a);
	const keyB = orderedKey_(b);

	return Number(keyA > keyB ? keyA - keyB : keyB - keyA);
}
