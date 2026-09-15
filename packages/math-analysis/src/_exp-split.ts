/**
 * Largest magnitude to hand `Math.exp` directly. Below binary64's `-745`
 * underflow edge with room to spare, so no intermediate lands in the subnormals
 * where it would shed bits.
 */
const SAFE_EXPONENT_ = 700;

/** Beyond this the result has saturated whatever the split, so stop splitting. */
const MAX_SCALE_ = 1024;

/**
 * `e^(first + second)`, computed without ever forming the sum.
 *
 * The sum is the problem: an exponent of magnitude `E` can only be held to
 * `E·ε` absolutely in binary64, and `exp` turns that straight into `E·ε` of
 * relative error in the result — `7e-14` by `E = 700`. Exponentiating the two
 * pieces separately and multiplying costs one ulp each instead, regardless of
 * how large they are.
 *
 * When a piece alone would leave `exp`'s usable range, both are halved until
 * they fit and the result is squared back up. Halving is exact, and each
 * squaring adds one ulp, so the cost is `log₂` of the overshoot rather than the
 * full `E·ε`.
 *
 * @param first One addend of the exponent.
 * @param second The other addend.
 * @returns `e^(first + second)`.
 */
export function expSplit_(first: number, second: number): number {
	const magnitude = Math.max(Math.abs(first), Math.abs(second));

	if (!Number.isFinite(magnitude) || magnitude >= SAFE_EXPONENT_ * MAX_SCALE_) {
		return Math.exp(first + second);
	}

	let scale = 1;
	while (magnitude / scale >= SAFE_EXPONENT_) {
		scale *= 2;
	}

	// Dividing by a power of two is exact, so the split introduces no error of
	// its own.
	let value = Math.exp(first / scale) * Math.exp(second / scale);
	for (let remaining = scale; remaining > 1; remaining >>= 1) {
		value *= value;
	}

	return value;
}
