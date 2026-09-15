// Internal module — symmetric lookup table for mixed-type arithmetic promotion.
// Rules are registered by concrete type modules, enabling tree-shaking of
// unused type-pair combinations.

/**
 * Describes how to promote two different numeric types to a common type for
 * mixed-type arithmetic.
 */
export type PromoteRule = {
	/** Tag of the target promoted type. */
	readonly toTag: symbol;
	/** Coerces the left operand (of type A) to the promoted type. */
	readonly coerceLeft: (v: unknown) => unknown;
	/** Coerces the right operand (of type B) to the promoted type. */
	readonly coerceRight: (v: unknown) => unknown;
};

// ---------------------------------------------------------------------------
// Module-level singleton state
// ---------------------------------------------------------------------------

const _rules: Map<symbol, Map<symbol, PromoteRule>> = new Map();

/**
 * Registers a bidirectional promotion rule for the `(tagA, tagB)` pair. The
 * reverse `(tagB, tagA)` direction is also stored automatically, with the
 * coerce functions swapped.
 */
export function setPromoteRule(
	tagA: symbol,
	tagB: symbol,
	rule: PromoteRule,
): void {
	const forward = _rules.get(tagA) ?? new Map<symbol, PromoteRule>();
	forward.set(tagB, rule);
	_rules.set(tagA, forward);

	const reverse = _rules.get(tagB) ?? new Map<symbol, PromoteRule>();
	reverse.set(tagA, {
		toTag: rule.toTag,
		coerceLeft: rule.coerceRight,
		coerceRight: rule.coerceLeft,
	});
	_rules.set(tagB, reverse);
}

/**
 * Promotes `a` (of type `tagA`) and `b` (of type `tagB`) to their common
 * promoted type, returning `[coercedA, coercedB]`.
 *
 * @throws {RangeError} When no rule is registered for this type pair.
 */
export function normalizeTypes<T>(
	tagA: symbol,
	a: unknown,
	tagB: symbol,
	b: unknown,
): [T, T] {
	const rule = _rules.get(tagA)?.get(tagB);
	if (rule === undefined) {
		throw new RangeError(
			`No type promotion rule registered for (${String(tagA)}, ${String(tagB)})`,
		);
	}
	return [rule.coerceLeft(a) as T, rule.coerceRight(b) as T];
}
