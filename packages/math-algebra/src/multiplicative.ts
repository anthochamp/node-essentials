/**
 * A set closed under a single binary operation, written multiplicatively.
 *
 * Which laws that operation obeys — associativity, commutativity, the existence
 * of an identity or of inverses — is not expressible in a TypeScript type. It
 * is stated as data instead: see {@link AlgebraicStructure} and the named
 * constants beside it, and `checkRingLaws` and friends in `laws.ts`, which
 * verify the claim against real values.
 *
 * @template T - The carrier set.
 */
export interface IMultiplicative<T extends IMultiplicative<T>> {
	/** The operation `a · b`. */
	mul(other: T): T;
}

/**
 * A multiplicative structure in which every element has a two-sided inverse
 * satisfying `a · a⁻¹ = a⁻¹ · a = 1`. The identity is a static member of the
 * concrete type; `pow` is a derived convenience each type declares for itself,
 * since its signature is not uniform across carriers.
 *
 * @template T - The carrier set.
 */
export interface IMultiplicativeGroup<
	T extends IMultiplicativeGroup<T>,
> extends IMultiplicative<T> {
	/** The multiplicative inverse `a⁻¹`. */
	inv(): T;
}
