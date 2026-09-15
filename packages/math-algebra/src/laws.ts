import type { EuclideanDomain, Field, OrderedField, Ring } from "./evidence.js";

/** A law that failed, with the operands that broke it. */
export type LawViolation<T> = {
	readonly law: string;
	readonly operands: readonly T[];
};

/**
 * Checks the ring axioms against `samples` by exhaustive substitution.
 *
 * O(n³) in the sample count — associativity and distributivity are ternary.
 * Intended for property tests with a handful of hand-picked edge values, not
 * for large sample sets.
 *
 * @template T - The carrier set.
 * @param ring - Ring evidence for `T`.
 * @param samples - Values to substitute into the axioms.
 * @returns Every violation found, empty when the axioms hold.
 */
export function checkRingLaws<T>(
	ring: Ring<T>,
	samples: readonly T[],
): LawViolation<T>[] {
	const { zero, one, add, sub, neg, mul, eq } = ring;
	const violations: LawViolation<T>[] = [];
	const check = (law: string, held: boolean, ...operands: T[]): void => {
		if (!held) {
			violations.push({ law, operands });
		}
	};

	for (const a of samples) {
		check("additive identity", eq(add(a, zero), a), a);
		check("additive inverse", eq(add(a, neg(a)), zero), a);
		check("subtraction is addition of the inverse", eq(sub(a, a), zero), a);
		check("multiplicative identity", eq(mul(a, one), a), a);
		check("annihilation by zero", eq(mul(a, zero), zero), a);

		for (const b of samples) {
			check("additive commutativity", eq(add(a, b), add(b, a)), a, b);

			for (const c of samples) {
				check(
					"additive associativity",
					eq(add(add(a, b), c), add(a, add(b, c))),
					a,
					b,
					c,
				);
				check(
					"multiplicative associativity",
					eq(mul(mul(a, b), c), mul(a, mul(b, c))),
					a,
					b,
					c,
				);
				check(
					"left distributivity",
					eq(mul(a, add(b, c)), add(mul(a, b), mul(a, c))),
					a,
					b,
					c,
				);
				check(
					"right distributivity",
					eq(mul(add(a, b), c), add(mul(a, c), mul(b, c))),
					a,
					b,
					c,
				);
			}
		}
	}

	return violations;
}

/**
 * Checks the field axioms: the ring axioms, multiplicative commutativity, and
 * invertibility of every non-zero element.
 *
 * @template T - The carrier set.
 * @param field - Field evidence for `T`.
 * @param samples - Values to substitute into the axioms.
 * @returns Every violation found, empty when the axioms hold.
 */
export function checkFieldLaws<T>(
	field: Field<T>,
	samples: readonly T[],
): LawViolation<T>[] {
	const { zero, one, mul, div, inv, eq } = field;
	const violations = checkRingLaws(field, samples);

	for (const a of samples) {
		if (eq(a, zero)) {
			continue;
		}

		if (!eq(mul(a, inv(a)), one)) {
			violations.push({ law: "multiplicative inverse", operands: [a] });
		}

		for (const b of samples) {
			if (eq(b, zero)) {
				continue;
			}

			if (!eq(div(a, b), mul(a, inv(b)))) {
				violations.push({
					law: "division is multiplication by the inverse",
					operands: [a, b],
				});
			}
		}
	}

	for (const a of samples) {
		for (const b of samples) {
			if (!eq(mul(a, b), mul(b, a))) {
				violations.push({
					law: "multiplicative commutativity",
					operands: [a, b],
				});
			}
		}
	}

	return violations;
}

/**
 * Checks that the order is total, antisymmetric and transitive, and that it is
 * compatible with the field operations.
 *
 * @template T - The carrier set.
 * @param field - Ordered field evidence for `T`.
 * @param samples - Values to substitute into the axioms.
 * @returns Every violation found, empty when the axioms hold.
 */
export function checkOrderedFieldLaws<T>(
	field: OrderedField<T>,
	samples: readonly T[],
): LawViolation<T>[] {
	const { zero, add, mul, cmp, eq } = field;
	const violations = checkFieldLaws(field, samples);
	const check = (law: string, held: boolean, ...operands: T[]): void => {
		if (!held) {
			violations.push({ law, operands });
		}
	};

	for (const a of samples) {
		check("reflexivity", cmp(a, a) === 0, a);

		for (const b of samples) {
			check("antisymmetry", cmp(a, b) === -cmp(b, a), a, b);
			check(
				"comparison agrees with equality",
				(cmp(a, b) === 0) === eq(a, b),
				a,
				b,
			);

			for (const c of samples) {
				check(
					"translation invariance",
					cmp(a, b) === cmp(add(a, c), add(b, c)),
					a,
					b,
					c,
				);

				if (cmp(a, b) <= 0 && cmp(b, c) <= 0) {
					check("transitivity", cmp(a, c) <= 0, a, b, c);
				}

				if (cmp(zero, a) <= 0 && cmp(zero, b) <= 0) {
					check(
						"products of non-negatives are non-negative",
						cmp(zero, mul(a, b)) <= 0,
						a,
						b,
					);
				}
			}
		}
	}

	return violations;
}

/**
 * Checks the Euclidean division property: `a = q · b + r` with `r` strictly
 * smaller than `b` under the degree function.
 *
 * @template T - The carrier set.
 * @param domain - Euclidean domain evidence for `T`.
 * @param samples - Values to substitute into the axioms.
 * @returns Every violation found, empty when the axioms hold.
 */
export function checkEuclideanLaws<T>(
	domain: EuclideanDomain<T>,
	samples: readonly T[],
): LawViolation<T>[] {
	const { zero, add, mul, eq, degree, divmod } = domain;
	const violations = checkRingLaws(domain, samples);

	for (const a of samples) {
		for (const b of samples) {
			if (eq(b, zero)) {
				continue;
			}

			const { quotient, remainder } = divmod(a, b);

			if (!eq(add(mul(quotient, b), remainder), a)) {
				violations.push({
					law: "division identity a = q·b + r",
					operands: [a, b],
				});
			}

			if (!eq(remainder, zero) && degree(remainder) >= degree(b)) {
				violations.push({
					law: "remainder is smaller than the divisor",
					operands: [a, b],
				});
			}
		}
	}

	return violations;
}
