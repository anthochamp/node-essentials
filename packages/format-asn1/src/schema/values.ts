/**
 * Runtime value representations used by the schema layer.
 *
 * These types carry the decoded or to-be-encoded values for ASN.1 types that
 * require more than a primitive JS value. They are intentionally separate from
 * the schema _definition_ types in `def.ts` and `types/`.
 */

// ─── BIT STRING ───────────────────────────────────────────────────────────────

/**
 * A decoded BIT STRING value per X.680 §22 / X.690 §8.6.
 *
 * `unusedBits` is the count of trailing (least-significant) bits in the last
 * byte of `bytes` that are not part of the bit string; valid range is 0..7.
 * When `bytes` is empty, `unusedBits` must be 0.
 */
export interface BitStringValue {
	readonly bytes: Uint8Array;
	readonly unusedBits: number;
}

// ─── REAL ─────────────────────────────────────────────────────────────────────

/**
 * A finite REAL value encoded as `mantissa × 10^exponent` (decimal base). Both
 * `mantissa` and `exponent` are arbitrary-precision integers, matching the
 * precision guarantees of the ASN.1 REAL type (X.680 §21, X.690 §8.5).
 */
export interface RealFiniteValue {
	readonly kind: "finite";
	/** Signed mantissa. Zero mantissa represents the value 0. */
	readonly mantissa: bigint;
	/** Exponent (may be negative). */
	readonly exponent: bigint;
}

/**
 * A REAL value: either a finite decimal or one of the three special values
 * PLUS-INFINITY, MINUS-INFINITY, and NOT-A-NUMBER (X.680 §21.1, X.690 §8.5.9).
 */
export type RealValue =
	| RealFiniteValue
	| { readonly kind: "plusInfinity" }
	| { readonly kind: "minusInfinity" }
	| { readonly kind: "notANumber" };

/** REAL special value: PLUS-INFINITY (X.680 §21.1). */
export const REAL_PLUS_INFINITY: RealValue = { kind: "plusInfinity" };
/** REAL special value: MINUS-INFINITY (X.680 §21.1). */
export const REAL_MINUS_INFINITY: RealValue = { kind: "minusInfinity" };
/** REAL special value: NOT-A-NUMBER (X.680 §21.1, ITU-T 2021 edition). */
export const REAL_NOT_A_NUMBER: RealValue = { kind: "notANumber" };
/** REAL value zero (mantissa = 0, exponent = 0). */
export const REAL_ZERO: RealValue = {
	kind: "finite",
	mantissa: 0n,
	exponent: 0n,
};

// ─── UTCTime ──────────────────────────────────────────────────────────────────

/**
 * A decoded UTCTime value per X.680 §45 / X.690 §11.8.
 *
 * `year` is the expanded four-digit year. The DER encoding allows only two
 * digits (YY); values 00..49 map to 2000..2049, 50..99 map to 1950..1999 (RFC
 * 5280 §4.1.2.5.1). The schema layer stores the expanded year directly.
 *
 * `utcOffsetMinutes` is 0 for the `Z` suffix (UTC), or a positive/negative
 * offset in minutes for `+HHMM`/`-HHMM` forms.
 */
export interface UtcTimeValue {
	readonly year: number;
	readonly month: number;
	readonly day: number;
	readonly hour: number;
	readonly minute: number;
	readonly second: number;
	readonly utcOffsetMinutes: number;
}

// ─── GeneralizedTime ─────────────────────────────────────────────────────────

/**
 * A decoded GeneralizedTime value per X.680 §46 / X.690 §11.7.
 *
 * `fraction` is a value in [0, 1) representing the fractional-second part (e.g.
 * `.5` → 500 ms). It is `undefined` when no fractional second was encoded.
 *
 * `utcOffsetMinutes` is `0` for the `Z` suffix, a non-zero integer for an
 * explicit `+HHMM`/`-HHMM` offset, and `undefined` when no timezone suffix is
 * present (local time).
 */
export interface GeneralizedTimeValue {
	readonly year: number;
	readonly month: number;
	readonly day: number;
	readonly hour: number;
	readonly minute: number;
	readonly second: number;
	readonly fraction?: number | null;
	readonly utcOffsetMinutes?: number | null;
}

// ─── ANY ──────────────────────────────────────────────────────────────────────

/**
 * A raw ANY value: the complete DER encoding (tag + length + content) of the
 * ANY value as received or to be sent. `encoded` is optional for encoding
 * (omitted encodes as empty); always present after decoding.
 */
export interface AnyValue {
	readonly encoded?: Uint8Array;
}

// ─── Named numbers and named bits ─────────────────────────────────────────────

/**
 * A named number: an IDENTIFIER associated with an INTEGER or ENUMERATED value
 * per X.680 §19.1 and §20.1.
 */
export interface NamedNumber {
	readonly name: string;
	readonly value: bigint;
}

/**
 * A named bit: an IDENTIFIER associated with a bit position in a BIT STRING per
 * X.680 §22.4. Bit 0 is the first (most-significant) bit.
 */
export interface NamedBit {
	readonly name: string;
	/** Zero-based index into the bit string; bit 0 is the most-significant bit. */
	readonly index: number;
}

// ─── Open type value ─────────────────────────────────────────────────────────

declare const openTypeValueBrand: unique symbol;

/**
 * A phantom-branded container for values carried in an ASN.1 open type
 * (information object class field whose governing type is unknown at
 * schema-definition time, X.681 §14).
 *
 * The type parameters `_Class` and `_Field` are phantom markers that allow the
 * TypeScript type system to distinguish open-type values from different
 * information object classes and fields, preventing accidental mixing.
 *
 * @template _Class — The information object class that governs this field.
 * @template _Field — The string literal name of the open field.
 */
export interface OpenTypeValue<
	_Class = unknown,
	_Field extends string = string,
> {
	readonly [openTypeValueBrand]: readonly [_Class, _Field];
	readonly value: unknown;
}
