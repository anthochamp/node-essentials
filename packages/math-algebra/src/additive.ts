/**
 * A set closed under an addition written additively.
 *
 * Commutativity and associativity are stated in the carrier's
 * {@link AlgebraicStructure}, not asserted by an empty interface.
 *
 * @template T - The carrier set.
 */
export interface IAdditive<T extends IAdditive<T>> {
	/** The additive operation `a + b`. */
	add(other: T): T;
}

/**
 * An additive group (S, +, 0, −) — every element has an additive inverse, so
 * subtraction is total. Cardinal numbers are additive but not an additive
 * group, since they admit no subtraction.
 *
 * @template T - The carrier set.
 */
export interface IAdditiveGroup<
	T extends IAdditiveGroup<T>,
> extends IAdditive<T> {
	/** The additive inverse `−a`. */
	neg(): T;

	/** Subtraction `a − b`, equivalent to `a.add(b.neg())`. */
	sub(other: T): T;
}
