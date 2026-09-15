import type { IField } from "./ring.js";
import type { Sign } from "./sign.js";

/**
 * A totally ordered set — every pair of elements is comparable, and the order
 * is antisymmetric, transitive and total.
 *
 * @template T - The carrier set.
 */
export interface IOrdered<T extends IOrdered<T>> {
	/** Three-way comparison consistent with the total order. */
	cmp(other: T): Sign;

	eq(other: T): boolean;
	lt(other: T): boolean;
	lte(other: T): boolean;
	gt(other: T): boolean;
	gte(other: T): boolean;

	/** The smaller of the two operands under the total order. */
	min(other: T): T;

	/** The larger of the two operands under the total order. */
	max(other: T): T;

	/** Restricts the value to `[lower, upper]`. */
	clamp(lower: T, upper: T): T;
}

/**
 * An ordered field — a field whose total order is compatible with the ring
 * operations: `a ≤ b` implies `a + c ≤ b + c`, and `0 ≤ a, 0 ≤ b` implies `0 ≤
 * a · b`.
 *
 * ℚ and ℝ are ordered fields; ℂ admits no such order.
 *
 * @template T - The carrier set of the field.
 */
export interface IOrderedField<T extends IOrderedField<T>>
	extends IField<T>, IOrdered<T> {
	/** The absolute value `|a|`. */
	abs(): T;

	/** The sign of the value: `-1`, `0` or `1`. */
	sign(): Sign;
}
