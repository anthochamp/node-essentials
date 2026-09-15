import { bitsToFloat16, float16ToBits } from "@ac-kit/core";
import { Sign } from "@ac-kit/math-algebra";

import { formatNumeral } from "../format-numeral.js";
import { IEEE_FORMAT_BINARY16, IeeeFormat } from "../ieee754/ieee-format.js";
import {
	integralFractionalFracPrecision,
	integralFractionalFromNumber,
	integralFractionalIntegralPrecision,
} from "../integral-fractional.js";
import { FixedPrecisionInfo, IBinaryEncoded } from "../precision-kind.js";
import { BinaryFpBase } from "./_binary-fp-base.js";
import { registerConverter } from "./_factory.js";
import { INum } from "./inum.js";

// ---------------------------------------------------------------------------
// fp16 bit access
// ---------------------------------------------------------------------------

/**
 * Max decimal precision representable in half precision (~3–4 significant
 * digits).
 */
const HALF_DIG = 3;

// ---------------------------------------------------------------------------
// BinaryFp16 — IEEE 754 binary16 (half precision), backed by JS `number`
// ---------------------------------------------------------------------------

/**
 * IEEE 754 binary16 (half-precision) floating-point number.
 *
 * Backed by a JS `number`; each operation rounds the result to half precision
 * using round-to-nearest-even before storing it.
 *
 * Range: ≈ ±65504; precision: ~3–4 significant decimal digits.
 *
 * References:
 *
 * - IEEE 754-2019: https://en.wikipedia.org/wiki/IEEE_754
 * - Half precision:
 *   https://en.wikipedia.org/wiki/Half-precision_floating-point_format
 */
export class BinaryFp16
	extends BinaryFpBase<BinaryFp16>
	implements INum, IBinaryEncoded
{
	get bitWidth(): 16 {
		return 16;
	}

	/** Unique type tag used by the converter registry. */
	static readonly TAG: unique symbol = Symbol("BinaryFp16");

	/**
	 * IEEE 754-2008 structural parameters for binary16. `b=2`, `k=16`, `p=11`,
	 * `emax=15`.
	 */
	static readonly IEEE754: IeeeFormat = IEEE_FORMAT_BINARY16;

	/** Additive identity `0.0h`. */
	static readonly ZERO: BinaryFp16 = new BinaryFp16(0);
	/** Multiplicative identity `1.0h`. */
	static readonly ONE: BinaryFp16 = new BinaryFp16(1);
	/** The value `2.0h`. */
	static readonly TWO: BinaryFp16 = new BinaryFp16(2);
	/** The value `10.0h`. */
	static readonly TEN: BinaryFp16 = new BinaryFp16(10);
	/** IEEE 754 Not-a-Number. */
	static readonly NAN: BinaryFp16 = new BinaryFp16(NaN);
	/** IEEE 754 positive infinity. */
	static readonly INFINITY: BinaryFp16 = new BinaryFp16(Infinity);
	/** IEEE 754 negative infinity. */
	static readonly NEG_INFINITY: BinaryFp16 = new BinaryFp16(-Infinity);

	/** Max finite positive float16 (65504). */
	static readonly MAX_VALUE: BinaryFp16 = new BinaryFp16(65504);
	/** Min positive normalised float16 (2^−14 ≈ 6.1035e-5). */
	static readonly MIN_VALUE: BinaryFp16 = new BinaryFp16(6.103515625e-5);

	/** Backing value, always rounded to float16 range. */
	readonly #value: number;

	constructor(value: number) {
		super();
		this.#value = Math.f16round(value);
	}

	/** Creates a `BinaryFp16` from a `number` or parseable numeric string. */
	static from(value: number | string): BinaryFp16 {
		return new BinaryFp16(typeof value === "string" ? Number(value) : value);
	}

	/**
	 * Creates a `BinaryFp16` from a raw 16-bit IEEE 754 bit pattern.
	 *
	 * @param bits - 16-bit unsigned integer bit pattern (values 0–65535).
	 */
	static fromBits(bits: number): BinaryFp16 {
		return new BinaryFp16(bitsToFloat16(bits));
	}

	// ---------------------------------------------------------------------------
	// Special-value predicates
	// ---------------------------------------------------------------------------

	/** `true` if this value is IEEE 754 NaN. */
	get isNaN(): boolean {
		return isNaN(this.#value);
	}

	/** `true` if this value is finite (not NaN and not ±∞). */
	get isFinite(): boolean {
		return isFinite(this.#value);
	}

	/** `true` if this value is +∞ or −∞. */
	get isInfinite(): boolean {
		return !isFinite(this.#value) && !isNaN(this.#value);
	}

	// ---------------------------------------------------------------------------
	// INum — format & coercion
	// ---------------------------------------------------------------------------

	/** The shortest numeral that round-trips, or `radix` when given. */
	override toString(radix?: number): string {
		return this.#value.toString(radix);
	}

	override toFixed(fractionDigits = 0): string {
		return this.#value.toFixed(fractionDigits);
	}

	override toExponential(fractionDigits?: number): string {
		return this.#value.toExponential(fractionDigits);
	}

	override toPrecision(precision: number): string {
		return this.#value.toPrecision(precision);
	}

	override format(
		locales?: Intl.LocalesArgument,
		options?: Intl.NumberFormatOptions,
	): string {
		return formatNumeral(
			this.toString() as Intl.StringNumericLiteral,
			locales,
			options,
		);
	}

	/** Returns the underlying `number` value (float16-rounded). */
	override valueOf(): number {
		return this.#value;
	}

	/** Coerces to a JS primitive. */
	override [Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint {
		if (hint === "string") return this.format();
		return this.#value;
	}

	// ---------------------------------------------------------------------------
	// INum — precision queries
	// ---------------------------------------------------------------------------

	/** Number of significant decimal digits (~3–4 for float16). */
	override get decimalPrecision(): number {
		return HALF_DIG;
	}

	/** Number of decimal digits in the integer part. */
	override get integralPrecision(): number {
		return Number.isFinite(this.#value)
			? integralFractionalIntegralPrecision(
					integralFractionalFromNumber(this.#value),
				)
			: 1;
	}

	/** Number of decimal digits in the fractional part. */
	override get fractionalPrecision(): number {
		return Number.isFinite(this.#value)
			? integralFractionalFracPrecision(
					integralFractionalFromNumber(this.#value),
				)
			: 0;
	}

	// ---------------------------------------------------------------------------
	// IMultiplicative (multiplicative)
	// ---------------------------------------------------------------------------

	/** Returns `this × other`, rounded to float16. */
	override mul(other: BinaryFp16): BinaryFp16 {
		return new BinaryFp16(this.#value * other.#value);
	}

	/** Returns the multiplicative identity `1.0h`. */
	override identity(): BinaryFp16 {
		return BinaryFp16.ONE;
	}

	// ---------------------------------------------------------------------------
	// IAdditiveGroup
	// ---------------------------------------------------------------------------

	/** Returns `this + other`, rounded to float16. */
	override add(other: BinaryFp16): BinaryFp16 {
		return new BinaryFp16(this.#value + other.#value);
	}

	/** Returns the additive identity `0.0h`. */
	override zero(): BinaryFp16 {
		return BinaryFp16.ZERO;
	}

	/** Returns `−this`. */
	override neg(): BinaryFp16 {
		return new BinaryFp16(-this.#value);
	}

	/** Returns `this − other`, rounded to float16. */
	override sub(other: BinaryFp16): BinaryFp16 {
		return new BinaryFp16(this.#value - other.#value);
	}

	// ---------------------------------------------------------------------------
	// IField
	// ---------------------------------------------------------------------------

	/** Returns `1 / this`, rounded to float16. */
	override inv(): BinaryFp16 {
		return new BinaryFp16(1 / this.#value);
	}

	/** Returns `this / other`, rounded to float16. */
	override div(other: BinaryFp16): BinaryFp16 {
		return new BinaryFp16(this.#value / other.#value);
	}

	// ---------------------------------------------------------------------------
	// IOrdered
	// ---------------------------------------------------------------------------

	/**
	 * Three-way comparison.
	 *
	 * @throws {RangeError} When either value is NaN.
	 */
	override cmp(other: BinaryFp16): Sign {
		const ov = other.#value;
		if (isNaN(this.#value) || isNaN(ov)) {
			throw new RangeError("Cannot compare NaN values");
		}
		return this.#value < ov ? -1 : this.#value > ov ? 1 : 0;
	}

	// ---------------------------------------------------------------------------
	// Real operations
	// ---------------------------------------------------------------------------

	/** Absolute value `|x|`. */
	override abs(): BinaryFp16 {
		return new BinaryFp16(Math.abs(this.#value));
	}

	/**
	 * Sign of this value.
	 *
	 * @returns `-1` for negative, `0` for zero/NaN, `+1` for positive.
	 */
	override sign(): Sign {
		if (this.#value < 0) return -1;
		if (this.#value > 0) return 1;
		return 0;
	}

	/**
	 * Principal square root `√x`, rounded to float16. Returns `NaN` for negative
	 * inputs.
	 */
	override sqrt(): BinaryFp16 {
		return new BinaryFp16(Math.sqrt(this.#value));
	}

	// ---------------------------------------------------------------------------
	// IFixedPrecision — format descriptor
	// ---------------------------------------------------------------------------

	/** Fixed-precision format descriptor for IEEE 754 binary16. */
	override get formatInfo(): FixedPrecisionInfo<BinaryFp16> {
		return {
			minPositive: BinaryFp16.MIN_VALUE,
			maxPositive: BinaryFp16.MAX_VALUE,
			minNegative: new BinaryFp16(-65504),
			maxNegative: new BinaryFp16(-6.103515625e-5),
			maxDecimalPrecision: HALF_DIG,
		};
	}

	// ---------------------------------------------------------------------------
	// IBinaryEncoded
	// ---------------------------------------------------------------------------

	/**
	 * Returns the bit at `position` in the IEEE 754 binary16 layout. Position `0`
	 * is the least-significant bit; position `15` is the sign bit.
	 *
	 * @throws {RangeError} When `position` is outside `[0, 15]`.
	 */
	override bitAt(position: number): 0 | 1 {
		if (position < 0 || position > 15) {
			throw new RangeError(`bitAt: position ${position} out of range [0, 15]`);
		}
		return ((float16ToBits(this.#value) >>> position) & 1) as 0 | 1;
	}
}

// Register the BinaryFp16-specific converter.
registerConverter(BinaryFp16.TAG, (value) => {
	if (typeof value === "number" || typeof value === "string") {
		return BinaryFp16.from(value);
	}
	return null;
});

// ---------------------------------------------------------------------------
// Float16 — alternative naming convention alias
// ---------------------------------------------------------------------------

/**
 * Alias for {@link BinaryFp16}. Provided for consistency with `Float32`,
 * `Float64`, and `Float128` naming.
 */
export type Float16 = BinaryFp16;
/** @see Float16 */
export const Float16: typeof BinaryFp16 = BinaryFp16;
