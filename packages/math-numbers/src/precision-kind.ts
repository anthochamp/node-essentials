import { isObject } from "@ac-kit/core";

/**
 * Marker for numeric types whose representable range is bounded by a fixed
 * width, such as `Integer32` or `BinaryFp64`. Operations that leave the range
 * are resolved by the type's overflow policy.
 */
export interface IFixedPrecision {
	readonly precisionKind: "fixed";

	/** Total width of the representation, in bits. */
	readonly bitWidth: number;
}

/**
 * Marker for numeric types bounded only by available memory, such as `Integer`
 * or `BigDecimal`. These never overflow.
 */
export interface IArbitraryPrecision {
	readonly precisionKind: "arbitrary";
}

/** Marker for types encoded in radix 2. */
export interface IBinaryEncoded {
	readonly radix: 2;
}

/** Marker for types encoded in radix 10. */
export interface IDecimalEncoded {
	readonly radix: 10;
}

export type PrecisionKind = "fixed" | "arbitrary";

export function isFixedPrecision(value: unknown): value is IFixedPrecision {
	return (
		isObject(value) && (value as IFixedPrecision).precisionKind === "fixed"
	);
}

export function isArbitraryPrecision(
	value: unknown,
): value is IArbitraryPrecision {
	return (
		isObject(value) &&
		(value as IArbitraryPrecision).precisionKind === "arbitrary"
	);
}

/**
 * Marker interface for numeric types with a fixed storage width that bounds
 * their representable range.
 *
 * Implemented by: `Integer8`, `Integer16`, `Integer32`, `Integer64`,
 * `Integer128`, `Natural8`, `Natural16`, `Natural32`, `Natural64`,
 * `Natural128`, `BinaryFp16`, `BinaryFp32`, `BinaryFp64`, `BinaryFp128`.
 *
 * A static `FORMAT_INFO: FixedPrecisionInfo<T>` property on each concrete class
 * completes the contract.
 */

/**
 * Metadata describing the format of a fixed-precision numeric type.
 *
 * The static `FORMAT_INFO` property of a concrete class carries this.
 */
export type FixedPrecisionInfo<T> = {
	/** Smallest positive representable value (`> 0`). */
	readonly minPositive: T;
	/** Largest positive representable value. */
	readonly maxPositive: T;
	/**
	 * Largest negative value representable (closest negative to zero, `< 0`). For
	 * symmetric types (e.g. float) this equals `−minPositive`.
	 */
	readonly minNegative: T;
	/** Smallest (most negative) representable value. */
	readonly maxNegative: T;
	/**
	 * Number of significant decimal digits guaranteed to round-trip through the
	 * type without loss. Equivalent to C `DBL_DIG` for floating-point, or
	 * `floor(log₁₀(MAX))` for integer types.
	 */
	readonly maxDecimalPrecision: number;
};

/**
 * Metadata describing the format of an arbitrary-precision numeric type, whose
 * only limit is available memory.
 */
export type ArbitraryPrecisionInfo = {
	/**
	 * Numeric base of the internal representation. `2` for binary types (e.g. if
	 * backed by `bigint` bit-arrays), `10` for decimal types.
	 */
	readonly radix: 2 | 10;
	/**
	 * Minimum exponent of the internal representation (0 for integers,
	 * `-Infinity` for arbitrary-precision floating-point).
	 */
	readonly minExponent: number;
	/**
	 * Maximum exponent of the internal representation (`Infinity` for unbounded
	 * types).
	 */
	readonly maxExponent: number;
};
