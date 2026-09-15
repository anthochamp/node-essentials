import type { IRing } from "./ring.js";

/**
 * Result of a Euclidean division, satisfying `a = b · q + r` with `0 ≤ |r| <
 * |b|`.
 *
 * @template Q - The quotient type.
 * @template R - The remainder type.
 */
export type QuotientRemainder<Q, R> = {
	readonly quotient: Q;
	readonly remainder: R;
};

/**
 * A Euclidean domain — an integral domain equipped with a degree function that
 * admits division with remainder, which is what makes the Euclidean algorithm
 * (and therefore GCD) applicable.
 *
 * ℤ and the polynomial ring K[X] over a field K are Euclidean domains.
 *
 * @template T - The carrier set of the domain.
 */
export interface IEuclidean<T extends IEuclidean<T>> extends IRing<T> {
	/** The Euclidean degree, used as the termination measure of the algorithm. */
	degree(): number;

	/** Quotient of the Euclidean division `a ÷ b`. */
	divTrunc(other: T): T;

	/** Remainder of the Euclidean division `a mod b`. */
	rem(other: T): T;

	/** Quotient and remainder computed in a single pass. */
	divmod(other: T): QuotientRemainder<T, T>;
}
