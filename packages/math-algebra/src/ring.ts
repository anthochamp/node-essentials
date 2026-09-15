import type { IAdditiveGroup } from "./additive.js";
import type { IMultiplicative } from "./multiplicative.js";

/**
 * A ring (R, +, ·, 0, 1) — an abelian group under addition and a monoid under
 * multiplication, with multiplication distributing over addition.
 *
 * Whether the ring is commutative, an integral domain, or neither, is stated in
 * its {@link AlgebraicStructure}; those distinctions add no member and so cannot
 * be carried by a type.
 *
 * @template T - The carrier set of the ring.
 */
export interface IRing<T extends IRing<T>>
	extends IAdditiveGroup<T>, IMultiplicative<T> {}

/**
 * A field (F, +, ·, 0, 1) — a commutative ring in which every non-zero element
 * is invertible. ℚ, ℝ and ℂ are fields; ℤ is not.
 *
 * @template T - The carrier set of the field.
 */
export interface IField<T extends IField<T>> extends IRing<T> {
	/** The multiplicative inverse `a⁻¹`. Throws when `a` is zero. */
	inv(): T;

	/** Division `a / b`, equivalent to `a.mul(b.inv())`. */
	div(other: T): T;
}
