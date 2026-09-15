import { DBL_DIG, float64ToBits } from "@ac-kit/core";
import { Sign } from "@ac-kit/math-algebra";

import { formatNumeral } from "../format-numeral.js";
import { IEEE_FORMAT_BINARY64, IeeeFormat } from "../ieee754/ieee-format.js";
import {
	integralFractionalFracPrecision,
	integralFractionalFromNumber,
	integralFractionalIntegralPrecision,
	integralFractionalPrecision,
} from "../integral-fractional.js";
import {
	FixedPrecisionInfo,
	IBinaryEncoded,
	IFixedPrecision,
} from "../precision-kind.js";
import { BinaryFpBase } from "./_binary-fp-base.js";
import { registerConverter } from "./_factory.js";
import { INum } from "./inum.js";

// ---------------------------------------------------------------------------
// BinaryFp64 — IEEE 754 binary64 (double precision), backed by JS `number`
// ---------------------------------------------------------------------------

/**
 * IEEE 754 binary64 (double-precision) floating-point number.
 *
 * Backed directly by the native JS `number` type — all arithmetic is performed
 * by the JavaScript engine with hardware double-precision semantics.
 *
 * **Role in the type hierarchy:**
 *
 * - `BinaryFp16` and `BinaryFp32` are backed by a `number` too, rounding to their
 *   narrower precision after each operation.
 * - For software-emulated wide formats (binary128+), use {@link BinaryFp}.
 *
 * References:
 *
 * - IEEE 754-2019: https://en.wikipedia.org/wiki/IEEE_754
 * - Double precision:
 *   https://en.wikipedia.org/wiki/Double-precision_floating-point_format
 */
export class BinaryFp64
	extends BinaryFpBase<BinaryFp64>
	implements INum, IFixedPrecision, IBinaryEncoded
{
	get bitWidth(): 64 {
		return 64;
	}

	/** Unique type tag used by the converter registry. */
	static readonly TAG: unique symbol = Symbol("BinaryFp64");

	/**
	 * IEEE 754-2008 structural parameters for binary64. `b=2`, `k=64`, `p=53`,
	 * `emax=1023`.
	 */
	static readonly IEEE754: IeeeFormat = IEEE_FORMAT_BINARY64;

	/** Additive identity `0.0`. */
	static readonly ZERO: BinaryFp64 = new BinaryFp64(0);
	/** Multiplicative identity `1.0`. */
	static readonly ONE: BinaryFp64 = new BinaryFp64(1);
	/** The value `2.0`. */
	static readonly TWO: BinaryFp64 = new BinaryFp64(2);
	/** The value `10.0`. */
	static readonly TEN: BinaryFp64 = new BinaryFp64(10);
	/** IEEE 754 Not-a-Number. */
	static readonly NAN: BinaryFp64 = new BinaryFp64(NaN);
	/** IEEE 754 positive infinity. */
	static readonly INFINITY: BinaryFp64 = new BinaryFp64(Infinity);
	/** IEEE 754 negative infinity. */
	static readonly NEG_INFINITY: BinaryFp64 = new BinaryFp64(-Infinity);

	constructor(private readonly value: number) {
		super();
	}

	/** Creates a `BinaryFp64` from a `number` or parseable numeric string. */
	static from(value: number | string): BinaryFp64 {
		return new BinaryFp64(typeof value === "string" ? Number(value) : value);
	}

	// ---------------------------------------------------------------------------
	// Special-value predicates
	// ---------------------------------------------------------------------------

	/** `true` if this value is IEEE 754 NaN. */
	get isNaN(): boolean {
		return isNaN(this.value);
	}

	/** `true` if this value is finite (not NaN and not ±∞). */
	get isFinite(): boolean {
		return isFinite(this.value);
	}

	/** `true` if this value is +∞ or −∞. */
	get isInfinite(): boolean {
		return !isFinite(this.value) && !isNaN(this.value);
	}

	// ---------------------------------------------------------------------------
	// INum — format & coercion
	// ---------------------------------------------------------------------------

	/** The shortest numeral that round-trips, or `radix` when given. */
	override toString(radix?: number): string {
		return this.value.toString(radix);
	}

	override toFixed(fractionDigits = 0): string {
		return this.value.toFixed(fractionDigits);
	}

	override toExponential(fractionDigits?: number): string {
		return this.value.toExponential(fractionDigits);
	}

	override toPrecision(precision: number): string {
		return this.value.toPrecision(precision);
	}

	override format(
		locales?: Intl.LocalesArgument,
		options?: Intl.NumberFormatOptions,
	): string {
		return formatNumeral(this.value, locales, options);
	}

	/** Returns the underlying `number` value. */
	override valueOf(): number {
		return this.value;
	}

	/** Coerces to a JS primitive. */
	override [Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint {
		if (hint === "string") return this.format();
		return this.value;
	}

	// ---------------------------------------------------------------------------
	// INum — precision queries
	// ---------------------------------------------------------------------------

	/**
	 * Number of significant decimal digits in this value's string representation.
	 * Returns `DBL_DIG` (15) for NaN/±∞.
	 */
	override get decimalPrecision(): number {
		return Number.isFinite(this.value)
			? integralFractionalPrecision(integralFractionalFromNumber(this.value))
			: DBL_DIG;
	}

	/**
	 * Number of decimal digits in the integer part of `|value|`. Always at least
	 * `1`.
	 */
	override get integralPrecision(): number {
		return Number.isFinite(this.value)
			? integralFractionalIntegralPrecision(
					integralFractionalFromNumber(this.value),
				)
			: 1;
	}

	/**
	 * Number of decimal digits in the fractional part of `|value|`. `0` for
	 * integer-valued doubles.
	 */
	override get fractionalPrecision(): number {
		return Number.isFinite(this.value)
			? integralFractionalFracPrecision(
					integralFractionalFromNumber(this.value),
				)
			: 0;
	}

	// ---------------------------------------------------------------------------
	// IMultiplicative (multiplicative)
	// ---------------------------------------------------------------------------

	/** Returns `this × other`. */
	override mul(other: BinaryFp64): BinaryFp64 {
		return new BinaryFp64(this.value * other.value);
	}

	/** Returns the multiplicative identity `1.0`. */
	override identity(): BinaryFp64 {
		return BinaryFp64.ONE;
	}

	// ---------------------------------------------------------------------------
	// IAdditiveGroup
	// ---------------------------------------------------------------------------

	/** Returns `this + other`. */
	override add(other: BinaryFp64): BinaryFp64 {
		return new BinaryFp64(this.value + other.value);
	}

	/** Returns the additive identity `0.0`. */
	override zero(): BinaryFp64 {
		return BinaryFp64.ZERO;
	}

	/** Returns `−this`. */
	override neg(): BinaryFp64 {
		return new BinaryFp64(-this.value);
	}

	/** Returns `this − other`. */
	override sub(other: BinaryFp64): BinaryFp64 {
		return new BinaryFp64(this.value - other.value);
	}

	// ---------------------------------------------------------------------------
	// IField
	// ---------------------------------------------------------------------------

	/** Returns `1 / this`. Returns ±∞ when `this` is zero (IEEE 754 semantics). */
	override inv(): BinaryFp64 {
		return new BinaryFp64(1 / this.value);
	}

	/** Returns `this / other` (IEEE 754 semantics). */
	override div(other: BinaryFp64): BinaryFp64 {
		return new BinaryFp64(this.value / other.value);
	}

	// ---------------------------------------------------------------------------
	// IOrdered
	// ---------------------------------------------------------------------------

	/**
	 * Three-way comparison.
	 *
	 * @throws {RangeError} When either value is NaN (NaN is unordered in IEEE
	 *   754).
	 */
	override cmp(other: BinaryFp64): Sign {
		const ov = other.value;
		if (isNaN(this.value) || isNaN(ov)) {
			throw new RangeError("Cannot compare NaN values");
		}
		return this.value < ov ? -1 : this.value > ov ? 1 : 0;
	}

	// ---------------------------------------------------------------------------
	// Real operations
	// ---------------------------------------------------------------------------

	/** Absolute value `|x|`. */
	override abs(): BinaryFp64 {
		return new BinaryFp64(Math.abs(this.value));
	}

	/**
	 * Sign of this value.
	 *
	 * @returns `-1` for negative, `0` for zero/NaN, `+1` for positive.
	 */
	override sign(): Sign {
		if (this.value < 0) return -1;
		if (this.value > 0) return 1;
		return 0;
	}

	/**
	 * Principal square root `√x`. Returns `NaN` for negative inputs (IEEE 754
	 * semantics).
	 *
	 * Reference: https://en.wikipedia.org/wiki/Square_root
	 */
	override sqrt(): BinaryFp64 {
		return new BinaryFp64(Math.sqrt(this.value));
	}

	// ---------------------------------------------------------------------------
	// IFixedPrecision — format descriptor
	// ---------------------------------------------------------------------------

	/** Fixed-precision format descriptor for IEEE 754 binary64. */
	override get formatInfo(): FixedPrecisionInfo<BinaryFp64> {
		return {
			minPositive: new BinaryFp64(Number.MIN_VALUE),
			maxPositive: new BinaryFp64(Number.MAX_VALUE),
			minNegative: new BinaryFp64(-Number.MAX_VALUE),
			maxNegative: new BinaryFp64(-Number.MIN_VALUE),
			maxDecimalPrecision: DBL_DIG,
		};
	}

	// ---------------------------------------------------------------------------
	// IBinaryEncoded
	// ---------------------------------------------------------------------------

	/**
	 * Returns the bit at `position` in the IEEE 754 binary64 layout of this
	 * value. Position `0` is the least-significant bit; position `63` is the sign
	 * bit.
	 *
	 * Reference: https://en.wikipedia.org/wiki/IEEE_754#Formats
	 *
	 * @throws {RangeError} When `position` is outside `[0, 63]`.
	 */
	override bitAt(position: number): 0 | 1 {
		if (position < 0 || position > 63) {
			throw new RangeError(`bitAt: position ${position} out of range [0, 63]`);
		}
		return Number((float64ToBits(this.value) >> BigInt(position)) & 1n) as
			| 0
			| 1;
	}
}

// Register the BinaryFp64-specific converter.
registerConverter(BinaryFp64.TAG, (value) => {
	if (typeof value === "number" || typeof value === "string") {
		return BinaryFp64.from(value);
	}
	return null;
});

// ---------------------------------------------------------------------------
// Float64 — alternative naming convention alias
// ---------------------------------------------------------------------------

/**
 * Alias for {@link BinaryFp64}. Provided for consistency with `Float16`,
 * `Float32`, and `Float128` naming.
 */
export type Float64 = BinaryFp64;
/** @see Float64 */
export const Float64: typeof BinaryFp64 = BinaryFp64;
