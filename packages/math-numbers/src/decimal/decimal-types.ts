import { DEFAULT_ROUNDING_MODE, RoundingMode } from "../rounding-mode.js";

/**
 * An exact base-10 value, stored as `coefficient × 10^exponent`.
 *
 * This is the arithmetic layer for arbitrary-precision decimal: plain data plus
 * free functions, each taking the {@link DecimalContext} that decides how many
 * significant digits to keep and which way to round. That is the same shape as
 * the soft-float kernel — `sfAdd(a, b, format)` — for the same reason: the
 * operation depends on a descriptor, and threading the descriptor through the
 * call is cheaper and clearer than storing it on every value.
 *
 * **Invariant:** the coefficient carries no trailing zeros, so a value has one
 * canonical representation and `precision` is the digit count of the
 * coefficient. Zero is `0 × 10⁰` with precision one.
 */
export type Decimal = {
	coefficient: bigint;
	exponent: number;

	/** Significant decimal digits in {@link coefficient}. */
	precision: number;
};

export const DECIMAL_ZERO = Object.freeze<Decimal>({
	coefficient: 0n,
	exponent: 0,
	precision: 1,
});

export const DECIMAL_ONE = Object.freeze<Decimal>({
	coefficient: 1n,
	exponent: 0,
	precision: 1,
});

export const DECIMAL_TWO = Object.freeze<Decimal>({
	coefficient: 2n,
	exponent: 0,
	precision: 1,
});

export const DECIMAL_TEN = Object.freeze<Decimal>({
	coefficient: 1n,
	exponent: 1,
	precision: 1,
});

/**
 * Precision and rounding settings for operations whose exact result may have no
 * finite decimal expansion, such as the division of repeating decimals or the
 * square root of a non-square integer.
 *
 * A precision of `0` means unlimited: the operation either terminates exactly
 * or throws.
 */
export type DecimalContext = {
	/** Number of significant decimal digits retained; `0` means unlimited. */
	precision: number;

	/**
	 * Rounding mode applied when the result is not exactly representable. The
	 * default is `half-even`, the IEEE 754 default.
	 */
	roundingMode: RoundingMode;
};

/**
 * Exact arithmetic — non-terminating operations are rejected rather than
 * rounded.
 */
export const DECIMAL_CONTEXT_UNLIMITED = Object.freeze<DecimalContext>({
	precision: 0,
	roundingMode: DEFAULT_ROUNDING_MODE,
});

/** 7 significant digits, matching the IEEE 754-2008 `decimal32` format. */
export const DECIMAL_CONTEXT_IEEE_DECIMAL32 = Object.freeze<DecimalContext>({
	precision: 7,
	roundingMode: DEFAULT_ROUNDING_MODE,
});

/** 16 significant digits, matching the IEEE 754-2008 `decimal64` format. */
export const DECIMAL_CONTEXT_IEEE_DECIMAL64 = Object.freeze<DecimalContext>({
	precision: 16,
	roundingMode: DEFAULT_ROUNDING_MODE,
});

/** 34 significant digits, matching the IEEE 754-2008 `decimal128` format. */
export const DECIMAL_CONTEXT_IEEE_DECIMAL128 = Object.freeze<DecimalContext>({
	precision: 34,
	roundingMode: DEFAULT_ROUNDING_MODE,
});
