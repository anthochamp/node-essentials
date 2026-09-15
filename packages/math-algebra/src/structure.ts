/**
 * The laws an operation satisfies. TypeScript cannot express associativity or
 * commutativity in a type, so an interface claiming them enforces nothing.
 * Stating them as data makes the claim inspectable at runtime and checkable by
 * the property tests in `laws.ts`.
 */
export type OperationLaws = {
	/** `(a ∘ b) ∘ c = a ∘ (b ∘ c)`. */
	readonly associative: boolean;

	/** `a ∘ b = b ∘ a`. */
	readonly commutative: boolean;

	/** An element `e` with `e ∘ a = a ∘ e = a` exists. */
	readonly identity: boolean;

	/** Every element (every non-zero element, for a field) has an inverse. */
	readonly inverses: boolean;
};

/**
 * The algebraic structure of a carrier set, as data.
 *
 * A structure is a pair of operations plus the way they interact. The named
 * constants below spell out the standard hierarchy; a concrete numeric type
 * points at whichever one it satisfies rather than implementing a chain of
 * empty marker interfaces.
 */
export type AlgebraicStructure = {
	readonly name: string;

	/** Laws of the additive operation, or `null` when there is only one. */
	readonly addition: OperationLaws | null;

	/** Laws of the multiplicative operation. */
	readonly multiplication: OperationLaws;

	/** `a · (b + c) = a · b + a · c`. */
	readonly distributive: boolean;

	/** Whether `a · b = 0` is possible with both `a` and `b` non-zero. */
	readonly zeroDivisors: boolean;

	/** Whether a total order compatible with the operations exists. */
	readonly ordered: boolean;
};

const NO_LAWS: OperationLaws = {
	associative: false,
	commutative: false,
	identity: false,
	inverses: false,
};

const laws = (spec: Partial<OperationLaws>): OperationLaws => ({
	...NO_LAWS,
	...spec,
});

/** (S, ·) — closed under one binary operation, with no further law. */
export const MAGMA: AlgebraicStructure = {
	name: "magma",
	addition: null,
	multiplication: NO_LAWS,
	distributive: false,
	zeroDivisors: true,
	ordered: false,
};

/** (S, ·) with an associative operation. */
export const SEMIGROUP: AlgebraicStructure = {
	...MAGMA,
	name: "semigroup",
	multiplication: laws({ associative: true }),
};

/** (S, ·, 1) — a semigroup with a two-sided identity. */
export const MONOID: AlgebraicStructure = {
	...SEMIGROUP,
	name: "monoid",
	multiplication: laws({ associative: true, identity: true }),
};

/** (S, ·, 1, ⁻¹) — a monoid in which every element is invertible. */
export const GROUP: AlgebraicStructure = {
	...MONOID,
	name: "group",
	multiplication: laws({ associative: true, identity: true, inverses: true }),
};

/** A group whose operation commutes. */
export const ABELIAN_GROUP: AlgebraicStructure = {
	...GROUP,
	name: "abelian group",
	multiplication: laws({
		associative: true,
		commutative: true,
		identity: true,
		inverses: true,
	}),
};

/** (R, +, ·, 0, 1) — an abelian group under `+`, a monoid under `·`. */
export const RING: AlgebraicStructure = {
	name: "ring",
	addition: laws({
		associative: true,
		commutative: true,
		identity: true,
		inverses: true,
	}),
	multiplication: laws({ associative: true, identity: true }),
	distributive: true,
	zeroDivisors: true,
	ordered: false,
};

/** A ring whose multiplication commutes. */
export const COMMUTATIVE_RING: AlgebraicStructure = {
	...RING,
	name: "commutative ring",
	multiplication: laws({
		associative: true,
		commutative: true,
		identity: true,
	}),
};

/** A commutative ring with no zero divisors — ℤ, for instance. */
export const INTEGRAL_DOMAIN: AlgebraicStructure = {
	...COMMUTATIVE_RING,
	name: "integral domain",
	zeroDivisors: false,
};

/** A ring in which every non-zero element is invertible, `·` need not commute. */
export const DIVISION_RING: AlgebraicStructure = {
	...RING,
	name: "division ring",
	multiplication: laws({ associative: true, identity: true, inverses: true }),
	zeroDivisors: false,
};

/** (F, +, ·, 0, 1) — ℚ, ℝ and ℂ. */
export const FIELD: AlgebraicStructure = {
	...INTEGRAL_DOMAIN,
	name: "field",
	multiplication: laws({
		associative: true,
		commutative: true,
		identity: true,
		inverses: true,
	}),
};

/** A field with a total order compatible with `+` and `·` — ℚ and ℝ. */
export const ORDERED_FIELD: AlgebraicStructure = {
	...FIELD,
	name: "ordered field",
	ordered: true,
};

/**
 * What floating point actually is.
 *
 * Every field operation is present and every one of them rounds, so
 * associativity and distributivity fail: in binary64, `(1e16 + 1) + -1e16 = 0`
 * while `1e16 + (1 + -1e16) = 1`. Overflow to infinity and underflow to zero
 * break closure as well, and `NaN` is not equal to itself.
 *
 * A `BinaryFp*` type therefore points here, not at {@link ORDERED_FIELD}. The
 * distinction is invisible to a marker interface, which is the reason this
 * information is data.
 */
export const APPROXIMATE_ORDERED_FIELD: AlgebraicStructure = {
	name: "approximate ordered field",
	addition: laws({ commutative: true, identity: true, inverses: true }),
	multiplication: laws({ commutative: true, identity: true, inverses: true }),
	distributive: false,
	zeroDivisors: false,
	ordered: true,
};

/** True when the multiplication is associative. */
export function isSemigroup(structure: AlgebraicStructure): boolean {
	return structure.multiplication.associative;
}

/** True when the multiplication is an associative operation with an identity. */
export function isMonoid(structure: AlgebraicStructure): boolean {
	return isSemigroup(structure) && structure.multiplication.identity;
}

/** True when every element has a multiplicative inverse. */
export function isGroup(structure: AlgebraicStructure): boolean {
	return isMonoid(structure) && structure.multiplication.inverses;
}

/** True when the multiplicative group commutes. */
export function isAbelianGroup(structure: AlgebraicStructure): boolean {
	return isGroup(structure) && structure.multiplication.commutative;
}

/** True when both operations are present and multiplication distributes. */
export function isRing(structure: AlgebraicStructure): boolean {
	const { addition } = structure;

	return (
		addition !== null &&
		addition.associative &&
		addition.commutative &&
		addition.identity &&
		addition.inverses &&
		isMonoid(structure) &&
		structure.distributive
	);
}

/** True when the ring's multiplication commutes. */
export function isCommutativeRing(structure: AlgebraicStructure): boolean {
	return isRing(structure) && structure.multiplication.commutative;
}

/** True when the commutative ring admits no zero divisors. */
export function isIntegralDomain(structure: AlgebraicStructure): boolean {
	return isCommutativeRing(structure) && !structure.zeroDivisors;
}

/** True when every non-zero element is invertible, commutativity aside. */
export function isDivisionRing(structure: AlgebraicStructure): boolean {
	return isRing(structure) && structure.multiplication.inverses;
}

/** True when every non-zero element of a commutative ring is invertible. */
export function isField(structure: AlgebraicStructure): boolean {
	return isIntegralDomain(structure) && structure.multiplication.inverses;
}

/** True when the field carries a compatible total order. */
export function isOrderedField(structure: AlgebraicStructure): boolean {
	return isField(structure) && structure.ordered;
}
