import { QuotientRemainder } from "./euclidean.js";
import type { Sign } from "./sign.js";

/**
 * Ring evidence for `T` — the additive and multiplicative structure of a ring
 * passed explicitly to a generic algorithm, rather than required structurally
 * of `T` itself.
 *
 * @template T - The carrier set of the ring.
 */
export type Ring<T> = {
	readonly zero: T;
	readonly one: T;
	add(a: T, b: T): T;
	sub(a: T, b: T): T;
	neg(a: T): T;
	mul(a: T, b: T): T;
	eq(a: T, b: T): boolean;
};

/**
 * Euclidean domain evidence for `T` — a ring that additionally supports
 * division with remainder, which is what the Euclidean algorithm needs.
 *
 * ℤ is a Euclidean domain but not a field, so `gcd` constrains on this rather
 * than on {@link Field}.
 *
 * @template T - The carrier set of the domain.
 */
export type EuclideanDomain<T> = Ring<T> & {
	degree(a: T): number;
	divmod(a: T, b: T): QuotientRemainder<T, T>;
};

/**
 * Field evidence for `T` — a commutative ring in which every non-zero element
 * is invertible.
 *
 * @template T - The carrier set of the field.
 */
export type Field<T> = Ring<T> & {
	inv(a: T): T;
	div(a: T, b: T): T;
};

/**
 * Ordered field evidence for `T` — a field whose total order is compatible with
 * its ring operations.
 *
 * @template T - The carrier set of the field.
 */
export type OrderedField<T> = Field<T> & {
	cmp(a: T, b: T): Sign;
	abs(a: T): T;
	sign(a: T): Sign;
};

/**
 * Division ring evidence for `T` — every non-zero element is invertible, but
 * multiplication need not commute. The quaternions ℍ form a division ring that
 * is not a field.
 *
 * @template T - The carrier set of the division ring.
 */
export type DivisionRing<T> = Ring<T> & {
	inv(a: T): T;
	divLeft(a: T, b: T): T;
	divRight(a: T, b: T): T;
};

/**
 * Composition algebra evidence for `T` over the scalar field `R` — an algebra
 * equipped with a multiplicative quadratic norm: `N(a · b) = N(a) · N(b)`.
 *
 * By Hurwitz's theorem the only such algebras over ℝ are ℝ, ℂ, ℍ and 𝕆. The
 * octonions are non-associative, so they satisfy this but not
 * {@link DivisionRing}'s associativity assumption.
 *
 * @template T - The carrier set of the algebra.
 * @template R - The scalar field the norm maps into.
 */
export type CompositionAlgebra<T, R> = {
	readonly zero: T;
	readonly one: T;
	add(a: T, b: T): T;
	sub(a: T, b: T): T;
	neg(a: T): T;
	mul(a: T, b: T): T;
	conjugate(a: T): T;
	norm(a: T): R;
	scale(a: T, scalar: R): T;
};
