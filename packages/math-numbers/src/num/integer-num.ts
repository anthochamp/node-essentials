import {
	bigIntBitLength,
	bigIntDivFloor,
	bigIntMod,
	bigIntParse,
	bigIntPopCount,
	bigIntSqrt,
	compareNaturalAscending,
	shiftRightUnsigned64,
} from "@ac-kit/core";
import type {
	AlgebraicStructure,
	EuclideanDomain,
	QuotientRemainder,
	Ring,
	Sign,
} from "@ac-kit/math-algebra";
import { INTEGRAL_DOMAIN, OrderedBase } from "@ac-kit/math-algebra";
import {
	bigIntDigitAt,
	bigIntDigitCount,
	bigIntDivmod,
	bigIntGcd,
	bigIntIsPrime,
	bigIntLcm,
} from "@ac-kit/math-integer";

// Type-only, so the value-level cycle stays broken by the ctor registry below.
import { decimalFromBigInt } from "../decimal/decimal-from-big-int.js";
import { decimalToExponential } from "../decimal/decimal-to-exponential.js";
import { decimalToFixed } from "../decimal/decimal-to-fixed.js";
import { decimalToPrecision } from "../decimal/decimal-to-precision.js";
import { formatNumeral } from "../format-numeral.js";
import type { IntegralFractional } from "../integral-fractional.js";
import type { OverflowMode } from "../overflow-mode.js";
import type {
	ArbitraryPrecisionInfo,
	IArbitraryPrecision,
	IDecimalEncoded,
} from "../precision-kind.js";
import { registerConverter } from "./_factory.js";
import type { Fraction } from "./fraction.js";
import { IBitwise } from "./ibitwise.js";
import { INum } from "./inum.js";

// ---------------------------------------------------------------------------
// Internal helper: fraction factory injection
// Set by fraction.ts at module load to break the circular dependency.
// ---------------------------------------------------------------------------
type FractionCtor = (n: Integer, d: Integer) => Fraction;
let _fractionCtor: FractionCtor | null = null;

/**
 * Registers the `Fraction` constructor for use by `Integer.inv()`, `.div()`,
 * and `.toFraction()`. Called once by the `fraction.ts` module.
 *
 * @internal
 */
export function _registerBigIntFractionCtor(ctor: FractionCtor): void {
	_fractionCtor = ctor;
}

// ---------------------------------------------------------------------------
// Integer
// ---------------------------------------------------------------------------

/**
 * An arbitrary-precision integer, wrapping the native `bigint` primitive.
 *
 * Full integer arithmetic, Euclidean division, bitwise operations, GCD/LCM and
 * primality testing. Its algebraic structure is stated as evidence:
 * {@link Integer.ring} and {@link Integer.euclideanDomain}.
 *
 * ```ts
 * const a = Integer.from(12n);
 * const b = Integer.from(8n);
 * a.add(b).format(); // "20"
 * a.gcd(b).format(); // "4"
 * a.inv().format(); // "1/12"  (returns a Fraction)
 * Integer.from(7n).isPrime(); // true
 * ```
 */
export class Integer
	extends OrderedBase<Integer>
	implements INum, IArbitraryPrecision, IDecimalEncoded, IBitwise<Integer>
{
	readonly precisionKind = "arbitrary" as const;
	readonly radix = 10 as const;

	/** @internal Raw bigint value — use `toBigInt()` for external access. */
	readonly #value: bigint;

	private constructor(value: bigint) {
		super();
		this.#value = value;
	}

	// Static constants

	/** Additive identity `0`. */
	static readonly ZERO: Integer = new Integer(0n);
	/** Multiplicative identity `1`. */
	static readonly ONE: Integer = new Integer(1n);
	/** The integer `2`. */
	static readonly TWO: Integer = new Integer(2n);
	/** The integer `10`. */
	static readonly TEN: Integer = new Integer(10n);

	/** Unique type tag used by {@link NumFactory} and {@link NumPromote}. */
	static readonly TAG: unique symbol = Symbol("Integer");

	/** ℤ is an integral domain, not a field — only ±1 are invertible. */
	static readonly STRUCTURE: AlgebraicStructure = INTEGRAL_DOMAIN;

	/**
	 * Format descriptor for arbitrary-precision decimal integers. Radix 10;
	 * exponent range is `[0, +∞)` (integers have no fractional part).
	 */
	static readonly FORMAT_INFO: ArbitraryPrecisionInfo = {
		radix: 10,
		minExponent: 0,
		maxExponent: Infinity,
	} as const satisfies ArbitraryPrecisionInfo;

	// Static evidence (typeclass instances)

	/**
	 * Evidence that `Integer` forms a [Euclidean
	 * domain](https://en.wikipedia.org/wiki/Euclidean_domain).
	 *
	 * Pass to generic algorithms such as `gcd()` or `lcm()` that accept any
	 * Euclidean domain. Because every Euclidean domain is also a ring, this
	 * object also satisfies `Ring<Integer>` — see {@link ring}.
	 */
	static readonly euclideanDomain: EuclideanDomain<Integer> = {
		zero: Integer.ZERO,
		one: Integer.ONE,
		add: (a, b) => a.add(b),
		neg: (a) => a.neg(),
		sub: (a, b) => a.sub(b),
		mul: (a, b) => a.mul(b),
		eq: (a, b) => a.eq(b),
		// Euclidean degree for ℤ is the absolute value.
		degree: (a) => Math.abs(a.valueOf()),
		divmod: (a, b) => a.divmod(b),
	};

	/**
	 * Evidence that `Integer` forms a
	 * [ring](https://en.wikipedia.org/wiki/Ring_(mathematics)).
	 *
	 * Identical to {@link euclideanDomain} — `Integer` satisfies all ring laws.
	 * Provided as a convenience alias when only ring operations are needed by the
	 * receiving algorithm.
	 */
	static readonly ring: Ring<Integer> = Integer.euclideanDomain;

	// Static factories

	/** Creates a `Integer` from a `bigint`, `number`, or decimal string. */
	static from(value: bigint | number | string): Integer {
		if (typeof value === "bigint") {
			return new Integer(value);
		}

		if (typeof value === "number") {
			if (!Number.isInteger(value)) {
				throw new RangeError(
					`Cannot create Integer from non-integer number: ${value}`,
				);
			}

			return new Integer(BigInt(value));
		}

		return new Integer(bigIntParse(value, 10));
	}

	/**
	 * Parses a string in any radix from 2 to 36.
	 *
	 * @throws {SyntaxError} When the string is not a valid integer in the given
	 *   radix.
	 */
	static parse(s: string, radix = 10): Integer {
		return new Integer(bigIntParse(s, radix));
	}

	// ---------------------------------------------------------------------------
	// Raw value access
	// ---------------------------------------------------------------------------

	/** Returns the underlying `bigint` value. */
	toBigInt(): bigint {
		return this.#value;
	}

	// ---------------------------------------------------------------------------
	// INum
	// ---------------------------------------------------------------------------

	/** The exact numeral, in `radix` when given — every base from 2 to 36. */
	override toString(radix?: number): string {
		return this.#value.toString(radix);
	}

	format(
		locales?: Intl.LocalesArgument,
		options?: Intl.NumberFormatOptions,
	): string {
		return formatNumeral(this.#value, locales, options);
	}

	/** Fixed-point notation with `fractionDigits` places, all of them zeros. */
	toFixed(fractionDigits = 0): string {
		return decimalToFixed(decimalFromBigInt(this.#value), fractionDigits);
	}

	/** Exponential notation, with as many places as asked for. */
	toExponential(fractionDigits?: number): string {
		return decimalToExponential(decimalFromBigInt(this.#value), fractionDigits);
	}

	/** `precision` significant digits, in whichever notation reads better. */
	toPrecision(precision: number): string {
		return decimalToPrecision(decimalFromBigInt(this.#value), precision);
	}

	/**
	 * Returns the nearest IEEE 754 double-precision approximation. Lossy for
	 * large values.
	 */
	override valueOf(): number {
		return Number(this.#value);
	}

	/**
	 * Coerces to a JS primitive. Returns `bigint` for numeric hints, string for
	 * string hint.
	 */
	[Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint {
		if (hint === "string") return this.toString();
		return this.#value;
	}

	// ---------------------------------------------------------------------------
	// INum — precision queries
	// ---------------------------------------------------------------------------

	/** Number of significant decimal digits in `|this|`. Minimum `1` (for zero). */
	get decimalPrecision(): number {
		return bigIntDigitCount(this.#value);
	}

	/**
	 * Number of decimal digits in the integer part of `|this|`. Equal to
	 * `decimalPrecision` for all integers (no fractional part).
	 */
	get integralPrecision(): number {
		return this.decimalPrecision;
	}

	/** Integers have no fractional digits — always `0`. */
	get fractionalPrecision(): number {
		return 0;
	}

	// ---------------------------------------------------------------------------
	// IMultiplicative / IMultiplicative / IMultiplicative (multiplicative)
	// ---------------------------------------------------------------------------

	/**
	 * Returns `this × other`.
	 *
	 * `mode` is accepted for interface compatibility with fixed-width integer
	 * types but is ignored — `Integer` is arbitrary-precision and never
	 * overflows.
	 */
	mul(other: Integer, _mode?: OverflowMode): Integer {
		return new Integer(this.#value * other.#value);
	}

	/** Returns the multiplicative identity `1`. */
	one(): Integer {
		return Integer.ONE;
	}

	// ---------------------------------------------------------------------------
	// IAdditive / IAdditive / IAdditiveGroup
	// ---------------------------------------------------------------------------

	/**
	 * Returns `this + other`.
	 *
	 * `mode` is accepted for interface compatibility with fixed-width integer
	 * types but is ignored — `Integer` is arbitrary-precision and never
	 * overflows.
	 */
	add(other: Integer, _mode?: OverflowMode): Integer {
		return new Integer(this.#value + other.#value);
	}

	/** Returns the additive identity `0`. */
	zero(): Integer {
		return Integer.ZERO;
	}

	/**
	 * Returns `−this`.
	 *
	 * `mode` is accepted for interface compatibility with fixed-width integer
	 * types but is ignored — `Integer` is arbitrary-precision and never
	 * overflows.
	 */
	neg(_mode?: OverflowMode): Integer {
		return new Integer(-this.#value);
	}

	/**
	 * Returns `this − other`.
	 *
	 * `mode` is accepted for interface compatibility with fixed-width integer
	 * types but is ignored.
	 */
	sub(other: Integer, _mode?: OverflowMode): Integer {
		return new Integer(this.#value - other.#value);
	}

	// ---------------------------------------------------------------------------
	// IOrdered
	// ---------------------------------------------------------------------------

	/**
	 * Three-way comparison.
	 *
	 * @returns `-1` if `this < other`, `0` if equal, `+1` if `this > other`.
	 */
	cmp(other: Integer): Sign {
		return compareNaturalAscending(this.#value, other.#value);
	}

	// ---------------------------------------------------------------------------
	// IEuclidean
	// ---------------------------------------------------------------------------

	/**
	 * Floored integer quotient `⌊this / other⌋`. For positive arguments this
	 * equals truncated division. For negative arguments, floors toward −∞ so that
	 * `mod` is always non-negative.
	 *
	 * @throws {RangeError} When `other` is zero.
	 */
	intdiv(other: Integer): Integer {
		return new Integer(bigIntDivFloor(this.#value, other.#value));
	}

	/**
	 * Non-negative Euclidean remainder: `this − other × intdiv(this, other)`.
	 * Satisfies `0 ≤ mod(a, b) < |b|` for all `a` and nonzero `b`.
	 *
	 * @throws {RangeError} When `other` is zero.
	 */
	mod(other: Integer): Integer {
		return new Integer(bigIntMod(this.#value, other.#value));
	}

	// ---------------------------------------------------------------------------
	// IBitwise
	// ---------------------------------------------------------------------------

	/** Returns `this & other` (bitwise AND). */
	bitwiseAnd(other: Integer): Integer {
		return new Integer(this.#value & other.#value);
	}

	/** Returns `this | other` (bitwise OR). */
	bitwiseOr(other: Integer): Integer {
		return new Integer(this.#value | other.#value);
	}

	/** Returns `this ^ other` (bitwise XOR). */
	bitwiseXor(other: Integer): Integer {
		return new Integer(this.#value ^ other.#value);
	}

	/** Returns `~this` (bitwise NOT). In two's complement: `~n = −n − 1`. */
	bitwiseNot(): Integer {
		return new Integer(~this.#value);
	}

	/** Returns `this << n`. Equivalent to multiplying by `2ⁿ`. */
	shiftLeft(n: number): Integer {
		if (n < 0) return this.shiftRight(-n);
		return new Integer(this.#value << BigInt(n));
	}

	/** Returns `this >> n` (arithmetic right shift — sign bit preserved). */
	shiftRight(n: number): Integer {
		if (n < 0) return this.shiftLeft(-n);
		return new Integer(this.#value >> BigInt(n));
	}

	/**
	 * Logical (unsigned) right shift `this >>> n`, treating the value as a 64-bit
	 * unsigned integer. Fills with zero bits on the left.
	 */
	unsignedShiftRight(n: number): Integer {
		return new Integer(shiftRightUnsigned64(this.#value, n));
	}

	bitLength(): number {
		return bigIntBitLength(this.#value);
	}

	popCount(): number {
		return bigIntPopCount(this.#value);
	}

	// ---------------------------------------------------------------------------
	// Real operations
	// ---------------------------------------------------------------------------

	/**
	 * Absolute value `|this|`.
	 *
	 * Reference: https://en.wikipedia.org/wiki/Absolute_value
	 */
	abs(): Integer {
		return this.#value < 0n ? new Integer(-this.#value) : this;
	}

	/**
	 * Sign of this integer.
	 *
	 * @returns `-1`, `0`, or `+1`. Reference:
	 *   https://en.wikipedia.org/wiki/Sign_(mathematics)
	 */
	sign(): Sign {
		if (this.#value < 0n) return -1;
		if (this.#value > 0n) return 1;
		return 0;
	}

	/**
	 * Integer floor square root `⌊√this⌋`.
	 *
	 * @throws {RangeError} When `this < 0` (square root of a negative integer is
	 *   not a real number — use a complex type instead). Reference:
	 *   https://en.wikipedia.org/wiki/Integer_square_root
	 */
	sqrt(): Integer {
		return new Integer(bigIntSqrt(this.#value));
	}

	// ---------------------------------------------------------------------------
	// Promotion to Fraction
	// ---------------------------------------------------------------------------

	/**
	 * Returns `1 / this` as an exact {@link Fraction} in ℚ.
	 *
	 * @throws {RangeError} When called on zero.
	 */
	inv(): Fraction {
		if (this.#value === 0n) throw new RangeError("Division by zero");
		return this.#makeFraction(Integer.ONE, this);
	}

	/**
	 * Returns `this / other` as an exact {@link Fraction} in ℚ. For the truncating
	 * integer quotient, use {@link intdiv}.
	 *
	 * @throws {RangeError} When `other` is zero.
	 */
	div(other: Integer): Fraction {
		if (other.#value === 0n) throw new RangeError("Division by zero");
		return this.#makeFraction(this, other);
	}

	/** Returns this integer as the fraction `this / 1`. */
	toFraction(): Fraction {
		return this.#makeFraction(this, Integer.ONE);
	}

	#makeFraction(n: Integer, d: Integer): Fraction {
		if (_fractionCtor === null) {
			throw new Error(
				"Import fraction.ts before calling inv(), div(), or toFraction() on Integer.",
			);
		}
		return _fractionCtor(n, d);
	}

	// ---------------------------------------------------------------------------
	// IIntegerNum (integer utilities)
	// ---------------------------------------------------------------------------

	/**
	 * Returns `gcd(this, other)` — the largest integer that divides both. Always
	 * non-negative. `gcd(0, 0) = 0`.
	 */
	gcd(other: Integer): Integer {
		return new Integer(bigIntGcd(this.#value, other.#value));
	}

	/**
	 * Returns `lcm(this, other)` — the smallest positive integer divisible by
	 * both. Returns `0` when either operand is zero.
	 */
	lcm(other: Integer): Integer {
		return new Integer(bigIntLcm(this.#value, other.#value));
	}

	/**
	 * Returns `true` if this integer is a prime number (positive, greater than 1,
	 * divisible only by 1 and itself). Uses a deterministic Miller–Rabin test.
	 */
	isPrime(): boolean {
		return bigIntIsPrime(this.#value < 0n ? -this.#value : this.#value);
	}

	// ---------------------------------------------------------------------------
	// IArbitraryPrecision / IDecimalEncoded
	// ---------------------------------------------------------------------------

	/**
	 * Returns the decimal digit at the given `position`. Position `0` is the ones
	 * digit, `1` is tens, `2` is hundreds, etc. Negative positions (fractional
	 * digits) always return `0` for integers.
	 *
	 * @example
	 * 	```ts
	 * 	Integer.from(1234n).digitAt(0); // → 4
	 * 	Integer.from(1234n).digitAt(3); // → 1
	 * 	Integer.from(1234n).digitAt(4); // → 0
	 * 	Integer.from(1234n).digitAt(-1); // → 0
	 * 	```;
	 */
	digitAt(position: number): number {
		return bigIntDigitAt(this.#value, position);
	}

	/**
	 * Returns the floored quotient and non-negative remainder of `this ÷ other`
	 * as a {@link QuotientRemainder} pair.
	 *
	 * Invariant: `other × q + r = this` and `0 ≤ r < |other|`.
	 *
	 * @throws {RangeError} When `other` is zero.
	 */
	divmod(other: Integer): QuotientRemainder<Integer, Integer> {
		const { quotient, remainder } = bigIntDivmod(this.#value, other.#value);

		return {
			quotient: new Integer(quotient),
			remainder: new Integer(remainder),
		};
	}

	/**
	 * Returns this integer as an {@link IntegralFractional}. The fractional part
	 * `f` is always `0n` because integers have no fraction.
	 */
	toIntegralFractional(): IntegralFractional {
		const negative = this.#value < 0n;
		return {
			s: negative ? -1 : 1,
			i: negative ? -this.#value : this.#value,
			f: 0n,
			fracDigits: 0,
		};
	}
}

// Register with the converter registry so Integer.from() is available via convert().
registerConverter(Integer.TAG, (value) => {
	if (
		typeof value === "bigint" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		try {
			return Integer.from(value);
		} catch {
			return null;
		}
	}
	return null;
});
