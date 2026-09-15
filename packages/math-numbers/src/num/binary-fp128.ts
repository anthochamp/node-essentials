import { Sign } from "@ac-kit/math-algebra";

import { IEEE_FORMAT_BINARY128, IeeeFormat } from "../ieee754/ieee-format.js";
import {
	FixedPrecisionInfo,
	IBinaryEncoded,
	IFixedPrecision,
} from "../precision-kind.js";
import { BinaryFpBase } from "./_binary-fp-base.js";
import { registerConverter } from "./_factory.js";
import { BinaryFp } from "./binary-fp.js";
import { INum } from "./inum.js";

// ---------------------------------------------------------------------------
// BinaryFp128 — IEEE 754 binary128 (quad precision), backed by BinaryFp
// ---------------------------------------------------------------------------

/**
 * Max decimal precision representable in quad precision (~33–34 significant
 * digits).
 */
const QUAD_DIG = 33;

/**
 * IEEE 754 binary128 (quadruple-precision) floating-point number.
 *
 * Backed by a {@link BinaryFp} instance configured with
 * `IEEE_FORMAT_BINARY128`. This provides a clean API with the correct numeric
 * type, while the actual arithmetic precision is currently limited to binary64
 * (JS `number`) until the bigint-backed `BinaryFp` implementation is complete.
 *
 * References:
 *
 * - IEEE 754-2019: https://en.wikipedia.org/wiki/IEEE_754
 * - Quadruple precision:
 *   https://en.wikipedia.org/wiki/Quadruple-precision_floating-point_format
 */
export class BinaryFp128
	extends BinaryFpBase<BinaryFp128>
	implements INum, IFixedPrecision, IBinaryEncoded
{
	get bitWidth(): 128 {
		return 128;
	}

	/** Unique type tag used by the converter registry. */
	static readonly TAG: unique symbol = Symbol("BinaryFp128");

	/**
	 * IEEE 754-2008 structural parameters for binary128. `b=2`, `k=128`, `p=113`,
	 * `emax=16383`.
	 */
	static readonly IEEE754: IeeeFormat = IEEE_FORMAT_BINARY128;

	/** Additive identity `0.0q`. */
	static readonly ZERO: BinaryFp128 = new BinaryFp128(0);
	/** Multiplicative identity `1.0q`. */
	static readonly ONE: BinaryFp128 = new BinaryFp128(1);
	/** The value `2.0q`. */
	static readonly TWO: BinaryFp128 = new BinaryFp128(2);
	/** The value `10.0q`. */
	static readonly TEN: BinaryFp128 = new BinaryFp128(10);
	/** IEEE 754 Not-a-Number. */
	static readonly NAN: BinaryFp128 = new BinaryFp128(NaN);
	/** IEEE 754 positive infinity. */
	static readonly INFINITY: BinaryFp128 = new BinaryFp128(Infinity);
	/** IEEE 754 negative infinity. */
	static readonly NEG_INFINITY: BinaryFp128 = new BinaryFp128(-Infinity);

	/**
	 * Internally backed by a `BinaryFp` instance configured with binary128
	 * params. All arithmetic is delegated to this instance; results are lifted
	 * back to `BinaryFp128` via the constructor.
	 */
	readonly #value: BinaryFp;

	/**
	 * Creates a `BinaryFp128` value.
	 *
	 * Accepts either a raw `number | string` (converted to binary128 soft-float)
	 * or an existing {@link BinaryFp} instance (used internally when wrapping
	 * arithmetic results).
	 *
	 * @param value - Initial value or backing soft-float.
	 * @throws {TypeError} When a `BinaryFp` is passed whose format is not
	 *   `IEEE_FORMAT_BINARY128` — guards against accidentally constructing a
	 *   `BinaryFp128` backed by a binary64 engine.
	 */
	constructor(value: number | string | BinaryFp) {
		super();
		if (value instanceof BinaryFp) {
			if (value.ieeeFormat !== IEEE_FORMAT_BINARY128) {
				throw new TypeError(
					`BinaryFp128: expected a BinaryFp configured with IEEE_FORMAT_BINARY128 ` +
						`(k=128, p=113), but received k=${value.ieeeFormat.k}, p=${value.ieeeFormat.p}.`,
				);
			}
			this.#value = value;
		} else {
			this.#value = new BinaryFp(IEEE_FORMAT_BINARY128, value);
		}
	}

	/** Creates a `BinaryFp128` from a `number` or parseable numeric string. */
	static from(value: number | string): BinaryFp128 {
		return new BinaryFp128(value);
	}

	// ---------------------------------------------------------------------------
	// Special-value predicates
	// ---------------------------------------------------------------------------

	/** `true` if this value is IEEE 754 NaN. */
	get isNaN(): boolean {
		return this.#value.isNaN;
	}

	/** `true` if this value is finite (not NaN and not ±∞). */
	get isFinite(): boolean {
		return this.#value.isFinite;
	}

	/** `true` if this value is +∞ or −∞. */
	get isInfinite(): boolean {
		return this.#value.isInfinite;
	}

	// ---------------------------------------------------------------------------
	// INum — format & coercion
	// ---------------------------------------------------------------------------

	/** The exact expansion, since no engine format can hold a binary128. */
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
		return this.#value.format(locales, options);
	}

	/**
	 * Returns the value as a JS `number` (binary64 approximation). Precision
	 * beyond ~15 significant decimal digits is lost.
	 */
	override valueOf(): number {
		return this.#value.valueOf();
	}

	/** Coerces to a JS primitive. */
	override [Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint {
		if (hint === "string") return this.format();
		return this.valueOf();
	}

	// ---------------------------------------------------------------------------
	// INum — precision queries
	// ---------------------------------------------------------------------------

	/**
	 * Number of significant decimal digits (~33 for binary128, currently limited
	 * to ~15 while backed by binary64).
	 */
	override get decimalPrecision(): number {
		return QUAD_DIG;
	}

	/** Number of decimal digits in the integer part. */
	override get integralPrecision(): number {
		return this.#value.integralPrecision;
	}

	/** Number of decimal digits in the fractional part. */
	override get fractionalPrecision(): number {
		return this.#value.fractionalPrecision;
	}

	// ---------------------------------------------------------------------------
	// IMultiplicative (multiplicative)
	// ---------------------------------------------------------------------------

	/** Returns `this × other`. */
	override mul(other: BinaryFp128): BinaryFp128 {
		return new BinaryFp128(this.#value.mul(other.#value));
	}

	/** Returns the multiplicative identity `1.0q`. */
	override identity(): BinaryFp128 {
		return BinaryFp128.ONE;
	}

	// ---------------------------------------------------------------------------
	// IAdditiveGroup
	// ---------------------------------------------------------------------------

	/** Returns `this + other`. */
	override add(other: BinaryFp128): BinaryFp128 {
		return new BinaryFp128(this.#value.add(other.#value));
	}

	/** Returns the additive identity `0.0q`. */
	override zero(): BinaryFp128 {
		return BinaryFp128.ZERO;
	}

	/** Returns `−this`. */
	override neg(): BinaryFp128 {
		return new BinaryFp128(this.#value.neg());
	}

	/** Returns `this − other`. */
	override sub(other: BinaryFp128): BinaryFp128 {
		return new BinaryFp128(this.#value.sub(other.#value));
	}

	// ---------------------------------------------------------------------------
	// IField
	// ---------------------------------------------------------------------------

	/** Returns `1 / this`. Returns ±∞ for zero (IEEE 754 semantics). */
	override inv(): BinaryFp128 {
		return new BinaryFp128(this.#value.inv());
	}

	/** Returns `this / other` (IEEE 754 semantics). */
	override div(other: BinaryFp128): BinaryFp128 {
		return new BinaryFp128(this.#value.div(other.#value));
	}

	// ---------------------------------------------------------------------------
	// IOrdered
	// ---------------------------------------------------------------------------

	/**
	 * Three-way comparison.
	 *
	 * @throws {RangeError} When either value is NaN.
	 */
	override cmp(other: BinaryFp128): Sign {
		return this.#value.cmp(other.#value);
	}

	// ---------------------------------------------------------------------------
	// Real operations
	// ---------------------------------------------------------------------------

	/** Absolute value `|x|`. */
	override abs(): BinaryFp128 {
		return new BinaryFp128(this.#value.abs());
	}

	/**
	 * Sign of this value.
	 *
	 * @returns `-1` for negative, `0` for zero/NaN, `+1` for positive.
	 */
	override sign(): Sign {
		return this.#value.sign();
	}

	/** Principal square root `√x`. Returns `NaN` for negative inputs. */
	override sqrt(): BinaryFp128 {
		return new BinaryFp128(this.#value.sqrt());
	}

	// ---------------------------------------------------------------------------
	// IFixedPrecision — format descriptor
	// ---------------------------------------------------------------------------

	/**
	 * Fixed-precision format descriptor for IEEE 754 binary128.
	 *
	 * Note: `minPositive`/`maxPositive` are currently approximated with binary64
	 * values. These will be corrected when bigint-backed `BinaryFp` is
	 * available.
	 */
	override get formatInfo(): FixedPrecisionInfo<BinaryFp128> {
		const info = this.#value.formatInfo;
		return {
			minPositive: new BinaryFp128(info.minPositive),
			maxPositive: new BinaryFp128(info.maxPositive),
			minNegative: new BinaryFp128(info.minNegative),
			maxNegative: new BinaryFp128(info.maxNegative),
			maxDecimalPrecision: QUAD_DIG,
		};
	}

	// ---------------------------------------------------------------------------
	// IBinaryEncoded
	// ---------------------------------------------------------------------------

	/**
	 * Returns the bit at `position` in the packed binary128 bit pattern. Position
	 * `0` is the LSB; position `127` is the sign bit.
	 *
	 * @throws {RangeError} When `position` is outside `[0, 127]`.
	 */
	override bitAt(position: number): 0 | 1 {
		return this.#value.bitAt(position);
	}
}

// Register the BinaryFp128-specific converter.
registerConverter(BinaryFp128.TAG, (value) => {
	if (typeof value === "number" || typeof value === "string") {
		return BinaryFp128.from(value);
	}
	return null;
});

// ---------------------------------------------------------------------------
// Float128 — alternative naming convention alias
// ---------------------------------------------------------------------------

/**
 * Alias for {@link BinaryFp128}. Provided for consistency with `Float16`,
 * `Float32`, and `Float64` naming.
 */
export type Float128 = BinaryFp128;
/** @see Float128 */
export const Float128: typeof BinaryFp128 = BinaryFp128;
