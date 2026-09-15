// Internal module — not exported from numbers/index.ts.
// Sentinel types and IEEE 754-like arithmetic helpers for the Extended<T> wrapper.

const NAN_SYM: unique symbol = Symbol("MathNaN");
const POS_INF_SYM: unique symbol = Symbol("PosInfinity");
const NEG_INF_SYM: unique symbol = Symbol("NegInfinity");

/** The type of the not-a-number sentinel `MATH_NAN`. */
export type MathNaN = typeof NAN_SYM;
/** The type of the positive-infinity sentinel `POS_INF`. */
export type PosInfinity = typeof POS_INF_SYM;
/** The type of the negative-infinity sentinel `NEG_INF`. */
export type NegInfinity = typeof NEG_INF_SYM;

/** A non-finite sentinel: one of `MATH_NAN`, `POS_INF`, or `NEG_INF`. */
export type SpecialValue = MathNaN | PosInfinity | NegInfinity;

/**
 * Not-a-number: the result of an indeterminate operation such as `0/0` or
 * `∞−∞`.
 */
export const MATH_NAN: MathNaN = NAN_SYM;
/** Positive infinity: the result of operations such as `x/0` for `x > 0`. */
export const POS_INF: PosInfinity = POS_INF_SYM;
/** Negative infinity: the result of operations such as `x/0` for `x < 0`. */
export const NEG_INF: NegInfinity = NEG_INF_SYM;

/** Returns `true` if `v` is any non-finite sentinel (`NaN`, `+∞`, or `−∞`). */
export function isSpecialValue(v: unknown): v is SpecialValue {
	return v === MATH_NAN || v === POS_INF || v === NEG_INF;
}

/** Returns `true` if `v` is the not-a-number sentinel. */
export function isMathNaN(v: unknown): v is MathNaN {
	return v === MATH_NAN;
}

/** Returns `true` if `v` is a positive or negative infinity sentinel. */
export function isInfinity(v: unknown): v is PosInfinity | NegInfinity {
	return v === POS_INF || v === NEG_INF;
}

// IEEE 754-like arithmetic helpers used by the Extended<T> wrapper.
// `null` represents a finite, non-zero operand whose exact value is handled externally.

/**
 * Returns the `SpecialValue` result of an addition when at least one operand is
 * non-finite. `null` represents a finite operand.
 *
 * | a    | b    | result |
 * | ---- | ---- | ------ |
 * | NaN  | *    | NaN    |
 * | *    | NaN  | NaN    |
 * | +∞   | +∞   | +∞     |
 * | −∞   | −∞   | −∞     |
 * | +∞   | −∞   | NaN    |
 * | ±∞   | null | ±∞     |
 * | null | ±∞   | ±∞     |
 */
export function specialAdd(
	a: SpecialValue | null,
	b: SpecialValue | null,
): SpecialValue {
	if (a === MATH_NAN || b === MATH_NAN) return MATH_NAN;
	if (a === null) return b as SpecialValue; // finite + ∞ = ∞
	if (b === null) return a; // ∞ + finite = ∞
	if (a === b) return a; // +∞ + +∞ = +∞, −∞ + −∞ = −∞
	return MATH_NAN; // +∞ + (−∞) = NaN
}

/**
 * Returns the `SpecialValue` result of a subtraction when at least one operand
 * is non-finite, derived from {@link specialAdd} by negating `b`.
 */
export function specialSub(
	a: SpecialValue | null,
	b: SpecialValue | null,
): SpecialValue {
	// Negate b: +∞ → −∞, −∞ → +∞, null → null (sign of finite handled by caller)
	const negB: SpecialValue | null =
		b === POS_INF ? NEG_INF : b === NEG_INF ? POS_INF : b;

	return specialAdd(a, negB);
}

/**
 * Returns the `SpecialValue` result of a multiplication when at least one
 * operand is non-finite. `null` represents a non-zero finite operand. Pass
 * `MATH_NAN` for an indeterminate operand (`0 × ∞`).
 *
 * | a    | b    | result (magnitude) |
 * | ---- | ---- | ------------------ |
 * | NaN  | *    | NaN                |
 * | *    | NaN  | NaN                |
 * | +∞   | +∞   | +∞                 |
 * | +∞   | −∞   | −∞                 |
 * | ∞    | null | ∞ (sign from `a`)  |
 * | null | ∞    | ∞ (sign from `b`)  |
 */
export function specialMul(
	a: SpecialValue | null,
	b: SpecialValue | null,
): SpecialValue {
	if (a === MATH_NAN || b === MATH_NAN) return MATH_NAN;
	if (a === null) return b as SpecialValue;
	if (b === null) return a;
	return a === b ? POS_INF : NEG_INF;
}

/**
 * Returns the `SpecialValue` result of a division when at least one operand is
 * non-finite. `null` represents a finite operand. `finite / ∞` equals zero
 * (finite) and does not reach this function.
 *
 * | a   | b    | result |
 * | --- | ---- | ------ |
 * | NaN | *    | NaN    |
 * | *   | NaN  | NaN    |
 * | ∞   | ∞    | NaN    |
 * | ∞   | null | ∞      |
 */
export function specialDiv(
	a: SpecialValue | null,
	b: SpecialValue | null,
): SpecialValue {
	if (a === MATH_NAN || b === MATH_NAN) return MATH_NAN;
	if (a !== null && b !== null) return MATH_NAN; // ∞ / ∞ = NaN
	if (a !== null) return a; // ∞ / finite — caller adjusts sign
	// a is null → finite / ∞: callers must not reach here (result is finite zero).
	return MATH_NAN;
}
