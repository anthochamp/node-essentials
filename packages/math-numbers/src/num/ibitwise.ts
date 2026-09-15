/**
 * Bitwise operations available on types whose elements have a two's-complement
 * or unsigned binary representation.
 *
 * @template T - The carrier set.
 */
export interface IBitwise<T extends IBitwise<T>> {
	bitwiseAnd(other: T): T;
	bitwiseOr(other: T): T;
	bitwiseXor(other: T): T;
	bitwiseNot(): T;

	/** Logical/arithmetic left shift by `count` bit positions. */
	shiftLeft(count: number): T;

	/** Arithmetic right shift, preserving the sign for signed types. */
	shiftRight(count: number): T;

	/** Logical right shift, filling with zero bits on the left. */
	unsignedShiftRight(count: number): T;

	/** Number of bits required to represent the magnitude, excluding the sign. */
	bitLength(): number;

	/** Count of set bits in the magnitude. */
	popCount(): number;
}
