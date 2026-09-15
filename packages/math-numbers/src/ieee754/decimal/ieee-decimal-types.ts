import { IeeeSign } from "../common/ieee-sign.js";

export type IeeeDecimalFinite = {
	readonly kind: "finite";
	readonly sign: IeeeSign;
	/**
	 * Quantum exponent — NOT renormalised; trailing zeros in `coefficient` are
	 * significant.
	 */
	readonly exponent: number;
	/** `0 ≤ coefficient < 10^p`. */
	readonly coefficient: bigint;
};
/** Decimal zero still carries a quantum (`0E+3` ≠ `0E-5`), unlike binary zero. */
export type IeeeDecimalZero = {
	readonly kind: "zero";
	readonly sign: IeeeSign;
	readonly exponent: number;
};
export type IeeeDecimalInf = {
	readonly kind: "inf";
	readonly sign: IeeeSign;
};
/**
 * Decimal distinguishes signaling from quiet NaN; binary's
 * `IeeeBinaryUnpackedNaN` does not.
 */
export type IeeeDecimalNaN = {
	readonly kind: "nan";
	readonly signaling: boolean;
	readonly payload: bigint;
};

export type IeeeDecimal =
	| IeeeDecimalFinite
	| IeeeDecimalZero
	| IeeeDecimalInf
	| IeeeDecimalNaN;
