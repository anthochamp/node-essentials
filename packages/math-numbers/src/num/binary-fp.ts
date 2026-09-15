import { Sign } from "@ac-kit/math-algebra";

import { decimalFromNumber } from "../decimal/decimal-from-number.js";
import { decimalFromString } from "../decimal/decimal-from-string.js";
import { decimalToExponential } from "../decimal/decimal-to-exponential.js";
import { decimalToFixed } from "../decimal/decimal-to-fixed.js";
import { decimalToPrecision } from "../decimal/decimal-to-precision.js";
import { Decimal } from "../decimal/decimal-types.js";
import { formatNumeral } from "../format-numeral.js";
import { narrowToBigInt } from "../ieee754/binary/_narrow-to-big-int.js";
import { packFromBigInt } from "../ieee754/binary/_pack-from-big-int.js";
import { ieeeBinaryAbs } from "../ieee754/binary/ieee-binary-abs.js";
import { ieeeBinaryAdd } from "../ieee754/binary/ieee-binary-add.js";
import { ieeeBinaryCmp } from "../ieee754/binary/ieee-binary-cmp.js";
import { ieeeBinaryFromDecimal } from "../ieee754/binary/ieee-binary-from-decimal.js";
import { ieeeBinaryFromNumber } from "../ieee754/binary/ieee-binary-from-number.js";
import { ieeeBinaryIsFinite } from "../ieee754/binary/ieee-binary-is-finite.js";
import { ieeeBinaryIsInfinite } from "../ieee754/binary/ieee-binary-is-infinite.js";
import { ieeeBinaryIsNaN } from "../ieee754/binary/ieee-binary-is-nan.js";
import { ieeeBinaryNeg } from "../ieee754/binary/ieee-binary-neg.js";
import { ieeeBinarySign } from "../ieee754/binary/ieee-binary-sign.js";
import { ieeeBinarySqrt } from "../ieee754/binary/ieee-binary-sqrt.js";
import { ieeeBinarySub } from "../ieee754/binary/ieee-binary-sub.js";
import { ieeeBinaryToDecimal } from "../ieee754/binary/ieee-binary-to-decimal.js";
import { ieeeBinaryToNumber } from "../ieee754/binary/ieee-binary-to-number.js";
import { ieeeBinaryToString } from "../ieee754/binary/ieee-binary-to-string.js";
import { IeeeBinary } from "../ieee754/binary/ieee-binary-types.js";
import {
	ieeeBinaryDiv,
	ieeeBinaryMul,
} from "../ieee754/binary/kernels/kernel.js";
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
// BinaryFp — IEEE 754 software-float, configured by Ieee754Parameters
// ---------------------------------------------------------------------------

/**
 * IEEE 754 binary floating-point number, fully configured at construction by an
 * {@link IeeeFormat} descriptor.
 *
 * **Backing store:** The primary backing is the `IeeeBinaryUnpacked`
 * discriminated union (unpacked sign, biased exponent, `bigint` significand).
 * The packed `Uint32Array` IEEE 754 bit pattern is computed lazily on first
 * access and cached for `bitAt()`, `valueOf()`, and related read operations.
 *
 * **Arithmetic** goes through whichever {@link SoftFloatKernel} is installed.
 * The default is the portable JS one; `createWasmSoftFloatKernel` swaps in the
 * compiled Rust module. Installation is synchronous, so an accelerated build
 * and a portable one have the same API — there is no `await` in front of
 * arithmetic and no second public type to choose between.
 *
 * **Role in the type hierarchy:**
 *
 * - `BinaryFp64` is backed by the native JS `number` (binary64 hardware).
 * - `BinaryFp16` and `BinaryFp32` are backed by a `number`, rounding the result
 *   of each operation back to their declared precision.
 * - `BinaryFp128` (and future wide formats) are backed by an instance of this
 *   class, configured with the appropriate `Ieee754Parameters`.
 *
 * **Note on `valueOf()`:** it returns a JS `number`, so for a format wider than
 * binary64 the result is a binary64 approximation (≤ ~15 significant decimal
 * digits). The string forms are not: `toString`, `toFixed`, `toExponential` and
 * `toPrecision` all go through the exact decimal expansion, so reach for one of
 * those when the extra precision is the point.
 *
 * References:
 *
 * - IEEE 754-2019: https://en.wikipedia.org/wiki/IEEE_754
 * - Quadruple precision:
 *   https://en.wikipedia.org/wiki/Quadruple-precision_floating-point_format
 */
export class BinaryFp
	extends BinaryFpBase<BinaryFp>
	implements INum, IFixedPrecision, IBinaryEncoded
{
	get bitWidth(): number {
		return this.ieeeFormat.k;
	}

	/** IEEE 754 format descriptor */
	readonly ieeeFormat: IeeeFormat;

	/**
	 * Unpacked soft-float value — primary backing store. All arithmetic
	 * operations read and write this field exclusively.
	 */
	#value: IeeeBinary;

	/** Unique type tag used by the converter registry. */
	static readonly TAG: unique symbol = Symbol("BinaryFp");

	/**
	 * Creates a new `BinaryFp` value for the given IEEE 754 format.
	 *
	 * @param format - Format descriptor (use one of the `IEEE_FORMAT_BINARY*`
	 *   constants).
	 * @param value - Initial value as a JS `number`, parseable string, or an
	 *   already-decoded `IeeeBinary` (internal use by `_wrapSf`).
	 */
	constructor(format: IeeeFormat, value: number | string | IeeeBinary) {
		super();
		this.ieeeFormat = format;
		if (typeof value === "object" && value !== null) {
			this.#value = value;
		} else if (typeof value === "string") {
			this.#value = ieeeBinaryFromDecimal(decimalFromString(value), format);
		} else {
			this.#value = ieeeBinaryFromNumber(value, format);
		}
	}

	// ---------------------------------------------------------------------------
	// Special-value predicates
	// ---------------------------------------------------------------------------

	/** `true` if this value is IEEE 754 NaN. */
	get isNaN(): boolean {
		return ieeeBinaryIsNaN(this.#value);
	}

	/** `true` if this value is finite (not NaN and not ±∞). */
	get isFinite(): boolean {
		return ieeeBinaryIsFinite(this.#value);
	}

	/** `true` if this value is +∞ or −∞. */
	get isInfinite(): boolean {
		return ieeeBinaryIsInfinite(this.#value);
	}

	// ---------------------------------------------------------------------------
	// INum — format & coercion
	// ---------------------------------------------------------------------------

	/**
	 * The shortest round-tripping numeral for a format the engine can hold, and
	 * the exact expansion for one it cannot — see {@link ieeeBinaryToString}.
	 */
	override toString(radix?: number): string {
		return ieeeBinaryToString(this.#value, this.ieeeFormat, radix);
	}

	override toFixed(fractionDigits = 0): string {
		return decimalToFixed(this.#toDecimal(), fractionDigits);
	}

	override toExponential(fractionDigits?: number): string {
		return decimalToExponential(this.#toDecimal(), fractionDigits);
	}

	override toPrecision(precision: number): string {
		return decimalToPrecision(this.#toDecimal(), precision);
	}

	/** The exact decimal, so a wide format is not capped at binary64 first. */
	#toDecimal(): Decimal {
		return this.#value.kind === "finite"
			? ieeeBinaryToDecimal(this.#value, this.ieeeFormat)
			: decimalFromNumber(ieeeBinaryToNumber(this.#value, this.ieeeFormat));
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

	/** Returns the value as a JS `number` (binary64 approximation). */
	override valueOf(): number {
		return ieeeBinaryToNumber(this.#value, this.ieeeFormat);
	}

	/** Coerces to a JS primitive. */
	override [Symbol.toPrimitive](
		hint: "number" | "string" | "default",
	): number | string | bigint {
		if (hint === "string") return this.format();
		return ieeeBinaryToNumber(this.#value, this.ieeeFormat);
	}

	// ---------------------------------------------------------------------------
	// INum — precision queries
	// ---------------------------------------------------------------------------

	/** Number of significant decimal digits in the binary64 approximation. */
	override get decimalPrecision(): number {
		const value = ieeeBinaryToNumber(this.#value, this.ieeeFormat);

		return Number.isFinite(value)
			? integralFractionalPrecision(integralFractionalFromNumber(value))
			: this.ieeeFormat.p;
	}

	/** Number of decimal digits in the integer part of `|value|`. */
	override get integralPrecision(): number {
		const value = ieeeBinaryToNumber(this.#value, this.ieeeFormat);

		return Number.isFinite(value)
			? integralFractionalIntegralPrecision(integralFractionalFromNumber(value))
			: 1;
	}

	/** Number of decimal digits in the fractional part. */
	override get fractionalPrecision(): number {
		const value = ieeeBinaryToNumber(this.#value, this.ieeeFormat);

		return Number.isFinite(value)
			? integralFractionalFracPrecision(integralFractionalFromNumber(value))
			: 0;
	}

	// ---------------------------------------------------------------------------
	// IMultiplicative (multiplicative)
	// ---------------------------------------------------------------------------

	/** Returns `this × other`. */
	override mul(other: BinaryFp): BinaryFp {
		return new BinaryFp(
			this.ieeeFormat,
			ieeeBinaryMul(this.#value, other.#value, this.ieeeFormat),
		);
	}

	/** Returns the multiplicative identity `1.0`. */
	override identity(): BinaryFp {
		return new BinaryFp(this.ieeeFormat, 1);
	}

	// ---------------------------------------------------------------------------
	// IAdditiveGroup
	// ---------------------------------------------------------------------------

	/** Returns `this + other`. */
	override add(other: BinaryFp): BinaryFp {
		return new BinaryFp(
			this.ieeeFormat,
			ieeeBinaryAdd(this.#value, other.#value, this.ieeeFormat),
		);
	}

	/** Returns the additive identity `0.0`. */
	override zero(): BinaryFp {
		return new BinaryFp(this.ieeeFormat, 0);
	}

	/** Returns `−this`. */
	override neg(): BinaryFp {
		return new BinaryFp(this.ieeeFormat, ieeeBinaryNeg(this.#value));
	}

	/** Returns `this − other`. */
	override sub(other: BinaryFp): BinaryFp {
		return new BinaryFp(
			this.ieeeFormat,
			ieeeBinarySub(this.#value, other.#value, this.ieeeFormat),
		);
	}

	// ---------------------------------------------------------------------------
	// IField
	// ---------------------------------------------------------------------------

	/** Returns `1 / this` (IEEE 754 semantics; ±∞ for zero). */
	override inv(): BinaryFp {
		return this.identity().div(this);
	}

	/** Returns `this / other` (IEEE 754 semantics). */
	override div(other: BinaryFp): BinaryFp {
		return new BinaryFp(
			this.ieeeFormat,
			ieeeBinaryDiv(this.#value, other.#value, this.ieeeFormat),
		);
	}

	// ---------------------------------------------------------------------------
	// IOrdered
	// ---------------------------------------------------------------------------

	/**
	 * Three-way comparison.
	 *
	 * @throws {RangeError} When either value is NaN.
	 */
	override cmp(other: BinaryFp): Sign {
		return ieeeBinaryCmp(this.#value, other.#value);
	}

	// ---------------------------------------------------------------------------
	// Real operations
	// ---------------------------------------------------------------------------

	/** Absolute value `|x|`. */
	override abs(): BinaryFp {
		return new BinaryFp(this.ieeeFormat, ieeeBinaryAbs(this.#value));
	}

	/** Returns −1 for negative, 0 for zero/NaN, +1 for positive. */
	override sign(): Sign {
		return ieeeBinarySign(this.#value);
	}

	/** Principal square root `√x`. Returns NaN for negative inputs. */
	override sqrt(): BinaryFp {
		return new BinaryFp(
			this.ieeeFormat,
			ieeeBinarySqrt(this.#value, this.ieeeFormat),
		);
	}

	// ---------------------------------------------------------------------------
	// IFixedPrecision
	// ---------------------------------------------------------------------------

	/**
	 * Fixed-precision format descriptor for this value's IEEE 754 format.
	 *
	 * The limit values are computed from the format parameters: - `minPositive`:
	 * smallest positive normal (`2^emin`) - `maxPositive`: largest finite (`(2 −
	 * 2^(1−p)) × 2^emax`)
	 */
	override get formatInfo(): FixedPrecisionInfo<BinaryFp> {
		const { p, emax } = this.ieeeFormat;
		const emin = 1 - emax;
		const format = this.ieeeFormat;

		// Smallest positive normal: sig = 2^(p-1), exp = emin
		const minPosSig = 1n << BigInt(p - 1);
		const minPos = new BinaryFp(format, {
			kind: "finite",
			sign: 0,
			exp: emin,
			sig: minPosSig,
		});

		// Largest finite: sig = 2^p − 1 (all bits set), exp = emax
		const maxPosSig = (1n << BigInt(p)) - 1n;
		const maxPos = new BinaryFp(format, {
			kind: "finite",
			sign: 0,
			exp: emax,
			sig: maxPosSig,
		});

		return {
			minPositive: minPos,
			maxPositive: maxPos,
			minNegative: new BinaryFp(format, {
				kind: "finite",
				sign: 1,
				exp: emax,
				sig: maxPosSig,
			}),
			maxNegative: new BinaryFp(format, {
				kind: "finite",
				sign: 1,
				exp: emin,
				sig: minPosSig,
			}),
			maxDecimalPrecision: Math.floor((format.p - 1) * Math.log10(2)),
		};
	}

	// ---------------------------------------------------------------------------
	// IBinaryEncoded
	// ---------------------------------------------------------------------------

	/**
	 * Returns the bit at `position` in the packed IEEE 754 bit pattern. Position
	 * `0` is the LSB; position `k − 1` is the sign bit.
	 *
	 * @throws {RangeError} When `position` is outside `[0, k − 1]`.
	 */
	override bitAt(position: number): 0 | 1 {
		const k = this.ieeeFormat.k;
		if (position < 0 || position >= k) {
			throw new RangeError(
				`bitAt: position ${position} out of range [0, ${k - 1}]`,
			);
		}
		const words = packFromBigInt(narrowToBigInt(this.#value), this.ieeeFormat);

		return ((words[position >>> 5]! >>> (position & 31)) & 1) as 0 | 1;
	}
}

// ---------------------------------------------------------------------------
// Package-internal factory
// ---------------------------------------------------------------------------

/**
 * Constructs a `BinaryFp` for the given IEEE 754 format.
 *
 * @internal Use `BinaryFp128.from()` etc. in user code.
 */
export function _newBinaryFp(
	ieee754: Omit<IeeeFormat, "b"> & { b: 2 },
	value: number | string,
): BinaryFp {
	return new BinaryFp(ieee754, value);
}

// Register the default BinaryFp (software-float) converter.
// BinaryFp64 registers its own separate converter under BinaryFp64.TAG.
registerConverter(BinaryFp.TAG, (value) => {
	if (typeof value === "number" || typeof value === "string") {
		return new BinaryFp(IEEE_FORMAT_BINARY64, value);
	}
	return null;
});
