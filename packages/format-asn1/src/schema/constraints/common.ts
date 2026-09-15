import type { ComponentRelationConstraintDef } from "./component-relation.js";
import type { ContentsConstraintDef } from "./contents.js";
import type { ExceptConstraintDef } from "./except.js";
import type { ExtensibleConstraintDef } from "./extensible.js";
import type { IntersectionConstraintDef } from "./intersection.js";
import type { PatternConstraintDef } from "./pattern.js";
import type { PermittedAlphabetConstraintDef } from "./permitted-alphabet.js";
import type { SizeConstraintDef } from "./size.js";
import type { TableConstraintDef } from "./table.js";
import type { UnionConstraintDef } from "./union.js";
import type { UserDefinedConstraintDef } from "./user-defined.js";
import type { ValueRangeConstraintDef } from "./value-range.js";
import type { WithComponentConstraintDef } from "./with-component.js";
import type { WithComponentsConstraintDef } from "./with-components.js";

/**
 * Numeric endpoint used by ASN.1 range-style constraints.
 *
 * Per X.680 §51.4 (Value range), especially §51.4.4 for `MIN` and `MAX`.
 *
 * String bounds are ASN.1 sentinels: - "MIN" for negative infinity / schema
 * minimum - "MAX" for positive infinity / schema maximum
 */
export type ConstraintEndpoint = bigint | number | "MIN" | "MAX";

/**
 * Presence marker used by `WITH COMPONENTS` constraints.
 *
 * Per X.680 §51.8.10 (PresenceConstraint).
 */
export type ComponentPresence = "present" | "absent" | "optional";

/** Constraint entry attached to a named component in `WITH COMPONENTS`. */
export type WithComponentsEntry = {
	readonly presence?: ComponentPresence;
	readonly constraint?: AnyConstraintDef;
};

/** Discriminated union of all constraint descriptors stored in `.def` trees. */
export type AnyConstraintDef =
	| ValueRangeConstraintDef
	| SizeConstraintDef
	| PermittedAlphabetConstraintDef
	| PatternConstraintDef
	| UnionConstraintDef
	| IntersectionConstraintDef
	| ExceptConstraintDef
	| ExtensibleConstraintDef
	| WithComponentsConstraintDef
	| WithComponentConstraintDef
	| ContentsConstraintDef
	| TableConstraintDef
	| ComponentRelationConstraintDef
	| UserDefinedConstraintDef;

// ── Constraint encapsulation ─────────────────────────────────────────────────
// The def tree lives behind a module-private symbol, reachable only through
// the chainable methods below or through `constraintRef()`/`constraintFromRef()`
// at def-tree boundaries. Every constraint kind shares the exact same method
// set, so there's no per-kind dispatch table needed for the reverse direction
// (unlike schemas).

const CONSTRAINT_DEF = Symbol();

/** Any ASN.1 constraint value: a hidden def tree plus its chainable methods. */
export type AnyConstraint<D extends AnyConstraintDef = AnyConstraintDef> =
	Readonly<Record<typeof CONSTRAINT_DEF, D>> & ConstraintMethods<D>;

/** Extract the raw constraint def from a constraint value. */
export function constraintRef<D extends AnyConstraintDef>(
	c: AnyConstraint<D>,
): D {
	return c[CONSTRAINT_DEF];
}

/** Reconstruct a chainable constraint value from a raw constraint def. */
export function constraintFromRef<D extends AnyConstraintDef>(
	def: D,
): AnyConstraint<D> {
	const self: AnyConstraint<D> = {
		[CONSTRAINT_DEF]: def,
		union: (...others) =>
			constraintFromRef({
				kind: "union",
				operands: [def, ...others.map(constraintRef)],
			}),
		intersect: (...others) =>
			constraintFromRef({
				kind: "intersection",
				operands: [def, ...others.map(constraintRef)],
			}),
		except: (excluded) =>
			constraintFromRef({
				kind: "except",
				base: def,
				excluded: constraintRef(excluded),
			}),
		extensible: () =>
			constraintFromRef({ kind: "extensibleConstraint", constraint: def }),
	};
	return self;
}

/** The chainable methods shared by every constraint value, regardless of kind. */
export interface ConstraintMethods<_D extends AnyConstraintDef> {
	/** Combine with more constraints via set union (`a | b | c`). */
	union(...others: readonly AnyConstraint[]): AnyConstraint<UnionConstraintDef>;
	/** Combine with more constraints via set intersection (`a ^ b ^ c`). */
	intersect(
		...others: readonly AnyConstraint[]
	): AnyConstraint<IntersectionConstraintDef>;
	/** Subtract another constraint (`this EXCEPT excluded`). */
	except(excluded: AnyConstraint): AnyConstraint<ExceptConstraintDef>;
	/** Mark this constraint as extensible (`this, ...`). */
	extensible(): AnyConstraint<ExtensibleConstraintDef>;
}
