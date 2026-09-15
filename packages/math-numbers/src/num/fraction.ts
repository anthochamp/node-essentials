import {
	ORDERED_FIELD,
	OrderedBase,
	Sign,
	type AlgebraicStructure,
	type Field,
	type OrderedField,
} from "@ac-kit/math-algebra";

import { decimalFromString } from "../decimal/decimal-from-string.js";
import { decimalToExponential } from "../decimal/decimal-to-exponential.js";
import { decimalToFixed } from "../decimal/decimal-to-fixed.js";
import { decimalToPrecision } from "../decimal/decimal-to-precision.js";
import { Decimal } from "../decimal/decimal-types.js";
import { rationalAbs } from "../rational/rational-abs.js";
import { rationalAdd } from "../rational/rational-add.js";
import { rationalCompare } from "../rational/rational-compare.js";
import { rationalDecimalPrecision } from "../rational/rational-decimal-precision.js";
import { rationalDiv } from "../rational/rational-div.js";
import { rationalFormat } from "../rational/rational-format.js";
import { rationalFractionalPrecision } from "../rational/rational-fractional-precision.js";
import { rationalIntegralFractional } from "../rational/rational-integral-fractional.js";
import { rationalInv } from "../rational/rational-inv.js";
import { rationalMul } from "../rational/rational-mul.js";
import { rationalNeg } from "../rational/rational-neg.js";
import { rationalNormalize } from "../rational/rational-normalize.js";
import { rationalReduce } from "../rational/rational-reduce.js";
import { rationalSign } from "../rational/rational-sign.js";
import { rationalSqrtExact } from "../rational/rational-sqrt-exact.js";
import { rationalSub } from "../rational/rational-sub.js";
import { rationalToDecimalString } from "../rational/rational-to-decimal-string.js";
import { rationalToNumber } from "../rational/rational-to-number.js";
import { rationalToString } from "../rational/rational-to-string.js";
import {
	Rational,
	RATIONAL_ONE,
	RATIONAL_ZERO,
} from "../rational/rational-types.js";
import { registerConverter } from "./_factory.js";
import { _registerBigIntFractionCtor, Integer } from "./integer-num.js";
import { INum } from "./inum.js";

/**
 * A rational number expressed as the exact fraction `p / q` with `p, q ∈ ℤ`, `q
 *
 * > 0`.
 *
 * The contract shell over {@link Rational}. Every operation delegates to the
 * free functions in `rational.ts`; no arithmetic happens in this class. What it
 * adds is the tower's uniform interface, the declared
 * {@link AlgebraicStructure}, the evidence records and the promotion tag — none
 * of which a bare pair of `bigint`s can carry.
 *
 * The `bigint` pair is also the storage, so arithmetic allocates no `Integer`.
 * {@link numerator} and {@link denominator} wrap on access, which is rare and
 * explicit.
 *
 * ```ts
 * const a = Fraction.from(1n, 3n);
 * const b = Fraction.from(1n, 6n);
 * a.add(b).reduce().format(); // "1/2"
 * Fraction.from(4n, 9n).sqrt().format(); // "2/3"
 * ```
 */
export class Fraction extends OrderedBase<Fraction> implements INum {
	readonly #value: Rational;

	private constructor(value: Rational) {
		super();
		this.#value = value;
	}

	// Static constants

	/** The fraction `0/1`. */
	static readonly ZERO: Fraction = new Fraction(RATIONAL_ZERO);

	/** The fraction `1/1`. */
	static readonly ONE: Fraction = new Fraction(RATIONAL_ONE);

	/** The fraction `−1/1`. */
	static readonly NEG_ONE: Fraction = new Fraction(rationalNeg(RATIONAL_ONE));

	/** Unique type tag used by the factory and promotion tables. */
	static readonly TAG: unique symbol = Symbol("Fraction");

	/** ℚ is an ordered field — exactly, since every operation is closed. */
	static readonly STRUCTURE: AlgebraicStructure = ORDERED_FIELD;

	/**
	 * Evidence that `Fraction` forms an ordered field, for generic algorithms
	 * that take their structure as an argument rather than requiring it of the
	 * type. Verified against `checkOrderedFieldLaws`.
	 */
	static readonly orderedField: OrderedField<Fraction> = {
		zero: Fraction.ZERO,
		one: Fraction.ONE,
		add: (a, b) => a.add(b),
		neg: (a) => a.neg(),
		sub: (a, b) => a.sub(b),
		mul: (a, b) => a.mul(b),
		eq: (a, b) => a.cmp(b) === 0,
		inv: (a) => a.inv(),
		div: (a, b) => a.div(b),
		cmp: (a, b) => a.cmp(b),
		abs: (a) => a.abs(),
		sign: (a) => a.sign(),
	};

	/** Field evidence, an alias of {@link orderedField} without the order. */
	static readonly field: Field<Fraction> = Fraction.orderedField;

	// Static factories

	/**
	 * Creates a `Fraction` from a numerator and denominator, accepting `Integer`,
	 * `bigint` or an integral `number` for each.
	 *
	 * @throws {RangeError} When the denominator is zero.
	 */
	static from(
		numerator: Integer | bigint | number,
		denominator: Integer | bigint | number = 1n,
	): Fraction {
		return new Fraction(
			rationalNormalize(_toBigInt(numerator), _toBigInt(denominator)),
		);
	}

	/** Wraps an already-normalised {@link Rational}. */
	static fromRational(value: Rational): Fraction {
		return new Fraction(value);
	}

	/** The underlying pair, for callers working at the arithmetic layer. */
	toRational(): Rational {
		return this.#value;
	}

	// ---------------------------------------------------------------------------
	// IFraction<Integer>
	// ---------------------------------------------------------------------------

	/** The numerator (may be negative). */
	get numerator(): Integer {
		return Integer.from(this.#value.numerator);
	}

	/** The denominator — always strictly positive. */
	get denominator(): Integer {
		return Integer.from(this.#value.denominator);
	}

	/** `true` when the fraction is known to be in lowest terms. */
	get isReduced(): boolean {
		return this.#value.reduced;
	}

	/** An equivalent fraction in lowest terms. */
	reduce(): Fraction {
		const reduced = rationalReduce(this.#value);

		return reduced === this.#value ? this : new Fraction(reduced);
	}

	// ---------------------------------------------------------------------------
	// INum
	// ---------------------------------------------------------------------------

	/** `p/q`, or just `p` when the denominator is one — exact in any radix. */
	override toString(radix?: number): string {
		return rationalToString(this.#value, radix);
	}

	/**
	 * The decimal value, localized. `Intl` has no ratio notation, so this is the
	 * decimal expansion rather than {@link toString}'s `p/q` — rounded to whatever
	 * `options` asks for, which for a non-terminating fraction is the only thing
	 * it could be.
	 */
	format(
		locales?: Intl.LocalesArgument,
		options?: Intl.NumberFormatOptions,
	): string {
		return rationalFormat(this.#value, locales, options);
	}

	/**
	 * Fixed-point notation with `fractionDigits` places. A repeating expansion is
	 * rounded there, since it has nowhere else to stop.
	 */
	toFixed(fractionDigits = 0): string {
		return decimalToFixed(this.#toDecimal(fractionDigits), fractionDigits);
	}

	/** Exponential notation, with as many places as asked for. */
	toExponential(fractionDigits?: number): string {
		return decimalToExponential(
			this.#toDecimal((fractionDigits ?? 0) + this.integralPrecision),
			fractionDigits,
		);
	}

	/** `precision` significant digits, in whichever notation reads better. */
	toPrecision(precision: number): string {
		return decimalToPrecision(this.#toDecimal(precision), precision);
	}

	/**
	 * The expansion to `places` places plus two guard digits, whose sticky last
	 * digit lets the caller round once more without the two roundings
	 * disagreeing.
	 */
	#toDecimal(places: number): Decimal {
		return decimalFromString(
			rationalToDecimalString(this.#value, Math.max(places, 0) + 2),
		);
	}

	/** The nearest binary64 approximation. */
	override valueOf(): number {
		return rationalToNumber(this.#value);
	}

	[Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint {
		return hint === "string" ? this.toString() : this.valueOf();
	}

	/**
	 * Significant digits of the decimal expansion, or `Infinity` when it does not
	 * terminate.
	 */
	get decimalPrecision(): number {
		return rationalDecimalPrecision(this.#value);
	}

	/** Decimal digits in the integer part of `|this|`. */
	get integralPrecision(): number {
		const { integral } = rationalIntegralFractional(rationalAbs(this.#value));

		return integral.toString().length;
	}

	/** Decimal places in the exact expansion, or `Infinity` when it repeats. */
	get fractionalPrecision(): number {
		return rationalFractionalPrecision(this.#value);
	}

	// ---------------------------------------------------------------------------
	// Ring and field operations
	// ---------------------------------------------------------------------------

	/** `(a/b) × (c/d)`. */
	mul(other: Fraction): Fraction {
		return new Fraction(rationalMul(this.#value, other.#value));
	}

	/** The multiplicative identity `1/1`. */
	identity(): Fraction {
		return Fraction.ONE;
	}

	/** `(a/b) + (c/d)`. */
	add(other: Fraction): Fraction {
		return new Fraction(rationalAdd(this.#value, other.#value));
	}

	/** The additive identity `0/1`. */
	zero(): Fraction {
		return Fraction.ZERO;
	}

	/** `−(a/b)`. */
	neg(): Fraction {
		return new Fraction(rationalNeg(this.#value));
	}

	/** `(a/b) − (c/d)`. */
	sub(other: Fraction): Fraction {
		return new Fraction(rationalSub(this.#value, other.#value));
	}

	/**
	 * The reciprocal `b/a`.
	 *
	 * @throws {RangeError} When called on zero.
	 */
	inv(): Fraction {
		return new Fraction(rationalInv(this.#value));
	}

	/**
	 * `(a/b) ÷ (c/d)`.
	 *
	 * @throws {RangeError} When `other` is zero.
	 */
	div(other: Fraction): Fraction {
		return new Fraction(rationalDiv(this.#value, other.#value));
	}

	// ---------------------------------------------------------------------------
	// Order
	// ---------------------------------------------------------------------------

	/** Three-way comparison. */
	cmp(other: Fraction): Sign {
		return rationalCompare(this.#value, other.#value);
	}

	// ---------------------------------------------------------------------------
	// Real operations
	// ---------------------------------------------------------------------------

	/** `|a/b|`. */
	abs(): Fraction {
		const value = rationalAbs(this.#value);

		return value === this.#value ? this : new Fraction(value);
	}

	/** `-1` for negative, `0` for zero, `1` for positive. */
	sign(): Sign {
		return rationalSign(this.#value);
	}

	/**
	 * The exact square root, when numerator and denominator are both perfect
	 * squares.
	 *
	 * @throws {RangeError} When this fraction is negative, or the root is
	 *   irrational.
	 */
	sqrt(): Fraction {
		const root = rationalSqrtExact(this.#value);

		if (root === null) {
			throw new RangeError(
				"Square root of this Fraction is irrational — use Decimal for an approximation",
			);
		}

		return new Fraction(root);
	}

	// ---------------------------------------------------------------------------
	// Exact rational form
	// ---------------------------------------------------------------------------

	/** Returns this fraction — it is already in ℚ exact form. */
	toFraction(): Fraction {
		return this;
	}
}

function _toBigInt(value: Integer | bigint | number): bigint {
	if (typeof value === "bigint") {
		return value;
	}

	if (typeof value === "number") {
		return BigInt(value);
	}

	return value.toBigInt();
}

// Integer.inv() produces a Fraction, so the constructor is handed over once
// this class body has been evaluated.
_registerBigIntFractionCtor((n, d) => Fraction.from(n, d));

registerConverter(Fraction.TAG, (value) => {
	if (value instanceof Fraction) {
		return value;
	}

	if (value instanceof Integer) {
		return Fraction.from(value);
	}

	if (typeof value === "bigint") {
		return Fraction.from(value);
	}

	if (typeof value === "number" && Number.isInteger(value)) {
		return Fraction.from(value);
	}

	return null;
});
