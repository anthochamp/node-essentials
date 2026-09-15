import {
	APPROXIMATE_ORDERED_FIELD,
	OrderedBase,
	Sign,
	type AlgebraicStructure,
} from "@ac-kit/math-algebra";

import { decimalAbs } from "../decimal/decimal-abs.js";
import { decimalAdd } from "../decimal/decimal-add.js";
import { decimalCompare } from "../decimal/decimal-compare.js";
import { decimalDigitAt } from "../decimal/decimal-digit-at.js";
import { decimalDiv } from "../decimal/decimal-div.js";
import { decimalFractionalPrecision } from "../decimal/decimal-fractional-precision.js";
import { decimalFromBigInt } from "../decimal/decimal-from-big-int.js";
import { decimalFromNumber } from "../decimal/decimal-from-number.js";
import { decimalFromString } from "../decimal/decimal-from-string.js";
import { decimalIntegralFractional } from "../decimal/decimal-integral-fractional.js";
import { decimalIntegralPrecision } from "../decimal/decimal-integral-precision.js";
import { decimalInv } from "../decimal/decimal-inv.js";
import { decimalMul } from "../decimal/decimal-mul.js";
import { decimalNeg } from "../decimal/decimal-neg.js";
import { decimalRoundToContext } from "../decimal/decimal-round-to-context.js";
import { decimalSign } from "../decimal/decimal-sign.js";
import { decimalSqrt } from "../decimal/decimal-sqrt.js";
import { decimalSub } from "../decimal/decimal-sub.js";
import { decimalToExponential } from "../decimal/decimal-to-exponential.js";
import { decimalToFixed } from "../decimal/decimal-to-fixed.js";
import { decimalToPrecision } from "../decimal/decimal-to-precision.js";
import { decimalToString } from "../decimal/decimal-to-string.js";
import {
	DECIMAL_ONE,
	DECIMAL_TEN,
	DECIMAL_TWO,
	DECIMAL_ZERO,
	Decimal,
	DecimalContext,
} from "../decimal/decimal-types.js";
import { formatNumeral } from "../format-numeral.js";
import { IntegralFractional } from "../integral-fractional.js";
import type {
	ArbitraryPrecisionInfo,
	IArbitraryPrecision,
	IDecimalEncoded,
} from "../precision-kind.js";
import { DEFAULT_ROUNDING_MODE, RoundingMode } from "../rounding-mode.js";
import { registerConverter } from "./_factory.js";
import { INum } from "./inum.js";

/** Addition and multiplication are exact, so they round at no precision. */
const EXACT_CONTEXT_ = {
	precision: 0,
	roundingMode: DEFAULT_ROUNDING_MODE,
} as const satisfies DecimalContext;

/**
 * An arbitrary-precision decimal floating-point number.
 *
 * The contract shell over {@link Decimal}. Every operation delegates to the
 * free functions in `decimal.ts`, which take the {@link DecimalContext} as an
 * argument — the same shape as the soft-float kernel, and for the same reason:
 * the result depends on a descriptor, so the descriptor belongs in the call
 * rather than on every value.
 *
 * Addition, subtraction and multiplication are exact and use no precision
 * bound. Division and square root cannot terminate in general, so they round to
 * Decimal128's 34 significant digits unless a context is supplied.
 *
 * ```ts
 * Decimal.from("0.1").add(Decimal.from("0.2")).format(); // "0.3", exact
 * Decimal.from(2).divTo(Decimal.from(3), 10).format(); // "0.6666666667"
 * ```
 */
export class DecimalNum
	extends OrderedBase<DecimalNum>
	implements INum, IArbitraryPrecision, IDecimalEncoded
{
	/** Unique type tag used by the factory and promotion tables. */
	static readonly TAG: unique symbol = Symbol("Decimal");

	readonly precisionKind = "arbitrary" as const;
	readonly radix = 10 as const;

	static readonly ZERO = new DecimalNum(DECIMAL_ZERO);
	static readonly ONE = new DecimalNum(DECIMAL_ONE);
	static readonly TWO = new DecimalNum(DECIMAL_TWO);
	static readonly TEN = new DecimalNum(DECIMAL_TEN);

	/**
	 * Decimal floating point rounds on division and square root, so like binary
	 * floating point it is not a field. Addition and multiplication are exact,
	 * but a structure describes the whole type, not a subset of its operations.
	 */
	static readonly STRUCTURE: AlgebraicStructure = APPROXIMATE_ORDERED_FIELD;

	/**
	 * The decimal format is arbitrary-precision, so it has no minimum or maximum
	 * exponent. The radix is 10, and the format is not signed or saturated.
	 */
	static readonly FORMAT_INFO = {
		radix: 10,
		minExponent: -Infinity,
		maxExponent: Infinity,
	} as const satisfies ArbitraryPrecisionInfo;

	readonly #value: Decimal;

	private constructor(value: Decimal) {
		super();
		this.#value = value;
	}

	/**
	 * Creates a `Decimal` from a `bigint`, `number` or decimal string.
	 *
	 * @throws {RangeError} When given NaN or an infinity.
	 * @throws {SyntaxError} When a string is not a valid decimal number.
	 */
	static from(value: bigint | number | string): DecimalNum {
		if (typeof value === "bigint") {
			return new DecimalNum(decimalFromBigInt(value));
		}

		if (typeof value === "number") {
			return new DecimalNum(decimalFromNumber(value));
		}

		return new DecimalNum(decimalFromString(value));
	}

	/**
	 * Parses a decimal string such as `"3.14"`, `"-0.001"` or `"1.23e-5"`.
	 *
	 * @throws {SyntaxError} When the string is not a valid decimal number.
	 */
	static parse(text: string): DecimalNum {
		return new DecimalNum(decimalFromString(text));
	}

	/** Wraps an already-canonical {@link Decimal}. */
	static fromDecimal(value: Decimal): DecimalNum {
		return new DecimalNum(value);
	}

	/** The underlying value, for callers working at the arithmetic layer. */
	toDecimal(): Decimal {
		return this.#value;
	}

	// ---------------------------------------------------------------------------
	// INum
	// ---------------------------------------------------------------------------

	/**
	 * The exact numeral in base ten, or `radix` truncated at the same intrinsic
	 * digit limit `Number.prototype.toString` applies.
	 */
	override toString(radix?: number): string {
		return decimalToString(this.#value, radix);
	}

	format(
		locales?: Intl.LocalesArgument,
		options?: Intl.NumberFormatOptions,
	): string {
		return formatNumeral(
			this.toString() as Intl.StringNumericLiteral,
			locales,
			options,
		);
	}

	/** Fixed-point notation with `fractionDigits` places, padded with zeros. */
	toFixed(fractionDigits = 0): string {
		return decimalToFixed(this.#value, fractionDigits);
	}

	/** Exponential notation, with as many places as asked for. */
	toExponential(fractionDigits?: number): string {
		return decimalToExponential(this.#value, fractionDigits);
	}

	/** `precision` significant digits, in whichever notation reads better. */
	toPrecision(precision: number): string {
		return decimalToPrecision(this.#value, precision);
	}

	/** The nearest binary64 approximation. */
	override valueOf(): number {
		return Number.parseFloat(this.toString());
	}
	[Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint {
		return hint === "string" ? this.toString() : this.valueOf();
	}

	/** Significant decimal digits, after stripping trailing zeros. */
	get decimalPrecision(): number {
		return this.#value.precision;
	}

	/** Decimal digits in the integer part of `|this|`, at least one. */
	get integralPrecision(): number {
		return decimalIntegralPrecision(this.#value);
	}

	/** Decimal digits in the fractional part of `|this|`. */
	get fractionalPrecision(): number {
		return decimalFractionalPrecision(this.#value);
	}

	// ---------------------------------------------------------------------------
	// Ring and field operations
	// ---------------------------------------------------------------------------

	/** `this × other`, exact. */
	mul(other: DecimalNum): DecimalNum {
		return new DecimalNum(
			decimalMul(this.#value, other.#value, EXACT_CONTEXT_),
		);
	}

	/** The multiplicative identity `1`. */
	identity(): DecimalNum {
		return DecimalNum.ONE;
	}

	/** `this + other`, exact. */
	add(other: DecimalNum): DecimalNum {
		return new DecimalNum(
			decimalAdd(this.#value, other.#value, EXACT_CONTEXT_),
		);
	}

	/** The additive identity `0`. */
	zero(): DecimalNum {
		return DecimalNum.ZERO;
	}

	/** `−this`. */
	neg(): DecimalNum {
		return new DecimalNum(decimalNeg(this.#value));
	}

	/** `this − other`, exact. */
	sub(other: DecimalNum): DecimalNum {
		return new DecimalNum(
			decimalSub(this.#value, other.#value, EXACT_CONTEXT_),
		);
	}

	/**
	 * `1 / this`, to 34 significant digits. Use `DECIMAL_ONE.divTo(this)` for
	 * another precision.
	 *
	 * @throws {RangeError} When called on zero.
	 */
	inv(): DecimalNum {
		return new DecimalNum(decimalInv(this.#value));
	}

	/**
	 * `this / other`, to 34 significant digits. Use {@link divTo} for another
	 * precision.
	 *
	 * @throws {RangeError} When `other` is zero.
	 */
	div(other: DecimalNum): DecimalNum {
		return new DecimalNum(decimalDiv(this.#value, other.#value));
	}

	/**
	 * `this / other`, to `precision` significant digits.
	 *
	 * @throws {RangeError} When `other` is zero.
	 */
	divTo(
		other: DecimalNum,
		precision: number,
		roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE,
	): DecimalNum {
		return new DecimalNum(
			decimalDiv(this.#value, other.#value, { precision, roundingMode }),
		);
	}

	/** Rounds to `precision` significant digits. */
	roundTo(
		precision: number,
		roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE,
	): DecimalNum {
		return new DecimalNum(
			decimalRoundToContext(this.#value, { precision, roundingMode }),
		);
	}

	// ---------------------------------------------------------------------------
	// Order
	// ---------------------------------------------------------------------------

	/** Three-way comparison. */
	cmp(other: DecimalNum): Sign {
		return decimalCompare(this.#value, other.#value);
	}

	// ---------------------------------------------------------------------------
	// Real operations
	// ---------------------------------------------------------------------------

	/** `|x|`. */
	abs(): DecimalNum {
		const value = decimalAbs(this.#value);

		return value === this.#value ? this : new DecimalNum(value);
	}

	/** `-1` for negative, `0` for zero, `1` for positive. */
	sign(): Sign {
		return decimalSign(this.#value);
	}

	/**
	 * Principal square root, to 34 significant digits.
	 *
	 * @throws {RangeError} When this value is negative.
	 */
	sqrt(): DecimalNum {
		return new DecimalNum(decimalSqrt(this.#value));
	}

	/**
	 * Principal square root, to `precision` significant digits.
	 *
	 * @throws {RangeError} When this value is negative.
	 */
	sqrtTo(
		precision: number,
		roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE,
	): DecimalNum {
		return new DecimalNum(
			decimalSqrt(this.#value, { precision, roundingMode }),
		);
	}

	// ---------------------------------------------------------------------------
	// IDecimalEncoded
	// ---------------------------------------------------------------------------

	/**
	 * The decimal digit at `position`: `0` is the ones digit, positive positions
	 * are higher integer digits, negative positions are fractional digits.
	 */
	digitAt(position: number): number {
		return decimalDigitAt(this.#value, position);
	}

	/** Splits into the integral part and the fractional digits. */
	toIntegralFractional(): IntegralFractional {
		return decimalIntegralFractional(this.#value);
	}
}

registerConverter(DecimalNum.TAG, (value) => {
	if (
		typeof value === "bigint" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		try {
			return DecimalNum.from(value);
		} catch {
			return null;
		}
	}

	return null;
});
