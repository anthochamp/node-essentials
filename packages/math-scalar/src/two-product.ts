/** Dekker's splitting constant for binary64: `2 ** ceil(53 / 2) + 1`. */
const SPLITTER_ = 2 ** 27 + 1;

/** Above this magnitude the splitter's own product overflows. */
const SPLIT_LIMIT_ = 2 ** 996;

const SPLIT_DOWN_ = 2 ** -28;
const SPLIT_UP_ = 2 ** 28;

/**
 * The exact rounding error of `product`, where `product` is the binary64 result
 * of `a * b` — so `a * b === product + twoProductError(a, b, product)` with no
 * error at all.
 *
 * Dekker's two-product, one of the error-free transformations: each operand is
 * split into two halves narrow enough that their pairwise products are exact,
 * and the discarded bits are reassembled from them. Seventeen operations, no
 * branch on the common path, and no allocation.
 *
 * The caller passes `product` rather than receiving it because JavaScript has
 * no multiple return values, and an object or tuple would allocate on every
 * call — unacceptable in the per-element loops this exists for.
 *
 * Operands above `2 ** 996` are scaled by a power of two first, which is exact,
 * so the whole finite range works. Two limits remain: if `a * b` overflowed
 * there is no error term to recover and the result is `NaN`, and if the exact
 * product is subnormal the error term loses the bits that underflowed.
 *
 * @param a First factor, exactly as passed to the multiplication.
 * @param b Second factor, exactly as passed to the multiplication.
 * @param product The binary64 result of `a * b`.
 * @returns The part of `a * b` that `product` dropped.
 */
export function twoProductError(a: number, b: number, product: number): number {
	let left = a;
	let right = b;
	let scaled = product;
	let rescale = 1;

	if (Math.abs(left) >= SPLIT_LIMIT_) {
		left *= SPLIT_DOWN_;
		scaled *= SPLIT_DOWN_;
		rescale *= SPLIT_UP_;
	}

	if (Math.abs(right) >= SPLIT_LIMIT_) {
		right *= SPLIT_DOWN_;
		scaled *= SPLIT_DOWN_;
		rescale *= SPLIT_UP_;
	}

	const leftScaled = SPLITTER_ * left;
	const leftHigh = leftScaled - (leftScaled - left);
	const leftLow = left - leftHigh;

	const rightScaled = SPLITTER_ * right;
	const rightHigh = rightScaled - (rightScaled - right);
	const rightLow = right - rightHigh;

	const dropped =
		scaled - leftHigh * rightHigh - leftLow * rightHigh - leftHigh * rightLow;

	return (leftLow * rightLow - dropped) * rescale;
}
