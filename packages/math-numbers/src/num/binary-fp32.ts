import { bitsToFloat32, float32ToBits, FLT_DIG } from "@ac-kit/core";
import { Sign } from "@ac-kit/math-algebra";

import { formatNumeral } from "../format-numeral.js";
import { IEEE_FORMAT_BINARY32, IeeeFormat } from "../ieee754/ieee-format.js";
import {
	integralFractionalFracPrecision,
	integralFractionalFromNumber,
	integralFractionalIntegralPrecision,
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
// BinaryFp32 — IEEE 754 binary32 (single precision), backed by JS `number`
// ---------------------------------------------------------------------------

/**
 * IEEE 754 binary32 (single-precision) floating-point number.
 *
 * Backed by a JS `number`; each operation rounds the result to single precision
 * via {@link Math.fround} before storing it. This faithfully models the
 * behaviour of a hardware float32, including overflow to ±∞ and underflow to
 * ±0.
 *
 * References:
 *
 * - IEEE 754-2019: https://en.wikipedia.org/wiki/IEEE_754
 * - Single precision:
 *   https://en.wikipedia.org/wiki/Single-precision_floating-point_format
 */
export class BinaryFp32
	extends BinaryFpBase<BinaryFp32>
	implements INum, IFixedPrecision, IBinaryEncoded
{
	get bitWidth(): 32 {
		return 32;
	}

	/** Unique type tag used by the converter registry. */
	static readonly TAG: unique symbol = Symbol("BinaryFp32");

	/**
	 * IEEE 754-2008 structural parameters for binary32. `b=2`, `k=32`, `p=24`,
	 * `emax=127`.
	 */
	static readonly IEEE754: IeeeFormat = IEEE_FORMAT_BINARY32;

	/** Additive identity `0.0f`. */
	static readonly ZERO: BinaryFp32 = new BinaryFp32(0);
	/** Multiplicative identity `1.0f`. */
	static readonly ONE: BinaryFp32 = new BinaryFp32(1);
	/** The value `2.0f`. */
	static readonly TWO: BinaryFp32 = new BinaryFp32(2);
	/** The value `10.0f`. */
	static readonly TEN: BinaryFp32 = new BinaryFp32(10);
	/** IEEE 754 Not-a-Number. */
	static readonly NAN: BinaryFp32 = new BinaryFp32(NaN);
	/** IEEE 754 positive infinity. */
	static readonly INFINITY: BinaryFp32 = new BinaryFp32(Infinity);
	/** IEEE 754 negative infinity. */
	static readonly NEG_INFINITY: BinaryFp32 = new BinaryFp32(-Infinity);

	/** Max finite positive float32 (~3.4028235e38). */
	static readonly MAX_VALUE: BinaryFp32 = new BinaryFp32(3.4028234663852886e38);
	/** Min positive normalised float32 (~1.175494e-38). */
	static readonly MIN_VALUE: BinaryFp32 = new BinaryFp32(
		1.1754943508222875e-38,
	);

	/** Backing value, always rounded to float32 range. */
	readonly #value: number;

	constructor(value: number | string) {
		super();
		this.#value = Math.fround(
			typeof value === "string" ? Number(value) : value,
		);
	}

	/** Creates a `BinaryFp32` from a `number` or parseable numeric string. */
	static from(value: number | string): BinaryFp32 {
		return new BinaryFp32(value);
	}

	/**
	 * Creates a `BinaryFp32` from raw 32-bit IEEE 754 bit pattern.
	 *
	 * @param bits - 32-bit unsigned integer bit pattern.
	 */
	static fromBits(bits: number): BinaryFp32 {
		return new BinaryFp32(bitsToFloat32(bits));
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

	/** Formats this value as a string using float32 precision (~7 decimal digits). */
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

	/** Returns the underlying `number` value (float32-rounded). */
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

	/** Number of significant decimal digits (~7 for float32). */
	override get decimalPrecision(): number {
		return FLT_DIG;
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

	/** Returns `this × other`, rounded to float32. */
	override mul(other: BinaryFp32): BinaryFp32 {
		return new BinaryFp32(this.#value * other.#value);
	}

	/** Returns the multiplicative identity `1.0f`. */
	override identity(): BinaryFp32 {
		return BinaryFp32.ONE;
	}

	// ---------------------------------------------------------------------------
	// IAdditiveGroup
	// ---------------------------------------------------------------------------

	/** Returns `this + other`, rounded to float32. */
	override add(other: BinaryFp32): BinaryFp32 {
		return new BinaryFp32(this.#value + other.#value);
	}

	/** Returns the additive identity `0.0f`. */
	override zero(): BinaryFp32 {
		return BinaryFp32.ZERO;
	}

	/** Returns `−this`. */
	override neg(): BinaryFp32 {
		return new BinaryFp32(-this.#value);
	}

	/** Returns `this − other`, rounded to float32. */
	override sub(other: BinaryFp32): BinaryFp32 {
		return new BinaryFp32(this.#value - other.#value);
	}

	// ---------------------------------------------------------------------------
	// IField
	// ---------------------------------------------------------------------------

	/** Returns `1 / this`, rounded to float32. */
	override inv(): BinaryFp32 {
		return new BinaryFp32(1 / this.#value);
	}

	/** Returns `this / other`, rounded to float32. */
	override div(other: BinaryFp32): BinaryFp32 {
		return new BinaryFp32(this.#value / other.#value);
	}

	// ---------------------------------------------------------------------------
	// IOrdered
	// ---------------------------------------------------------------------------

	/**
	 * Three-way comparison.
	 *
	 * @throws {RangeError} When either value is NaN.
	 */
	override cmp(other: BinaryFp32): Sign {
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
	override abs(): BinaryFp32 {
		return new BinaryFp32(Math.abs(this.#value));
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
	 * Principal square root `√x`, rounded to float32. Returns `NaN` for negative
	 * inputs.
	 */
	override sqrt(): BinaryFp32 {
		return new BinaryFp32(Math.sqrt(this.#value));
	}

	// ---------------------------------------------------------------------------
	// IFixedPrecision — format descriptor
	// ---------------------------------------------------------------------------

	/** Fixed-precision format descriptor for IEEE 754 binary32. */
	override get formatInfo(): FixedPrecisionInfo<BinaryFp32> {
		return {
			minPositive: BinaryFp32.MIN_VALUE,
			maxPositive: BinaryFp32.MAX_VALUE,
			minNegative: BinaryFp32.NEG_INFINITY, // not reachable but satisfies shape
			maxNegative: new BinaryFp32(-BinaryFp32.MIN_VALUE.valueOf()),
			maxDecimalPrecision: FLT_DIG,
		};
	}

	// ---------------------------------------------------------------------------
	// IBinaryEncoded
	// ---------------------------------------------------------------------------

	/**
	 * Returns the bit at `position` in the IEEE 754 binary32 layout. Position `0`
	 * is the least-significant bit; position `31` is the sign bit.
	 *
	 * @throws {RangeError} When `position` is outside `[0, 31]`.
	 */
	override bitAt(position: number): 0 | 1 {
		if (position < 0 || position > 31) {
			throw new RangeError(`bitAt: position ${position} out of range [0, 31]`);
		}
		return ((float32ToBits(this.#value) >>> position) & 1) as 0 | 1;
	}
}

// Register the BinaryFp32-specific converter.
registerConverter(BinaryFp32.TAG, (value) => {
	if (typeof value === "number" || typeof value === "string") {
		return new BinaryFp32(value);
	}
	return null;
});

// ---------------------------------------------------------------------------
// Float32 — alternative naming convention alias
// ---------------------------------------------------------------------------

/**
 * Alias for {@link BinaryFp32}. Provided for consistency with `Float16`,
 * `Float64`, and `Float128` naming.
 */
export type Float32 = BinaryFp32;
/** @see Float32 */
export const Float32: typeof BinaryFp32 = BinaryFp32;
