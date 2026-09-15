import type { AnyConstraintDef } from "./common.js";
import {
	constraintFromRef,
	constraintRef,
	type AnyConstraint,
} from "./common.js";

/** Extension-root marker wrapper (`constraint, ...`). */
export type ExtensibleConstraintDef = {
	readonly kind: "extensibleConstraint";
	readonly constraint: AnyConstraintDef;
};

/**
 * Extensible constraint marker (`constraint, ...`). Per X.680 §52 (Extension
 * marker), especially §52.3 for set arithmetic interaction.
 */
export type ExtensibleConstraint = AnyConstraint<ExtensibleConstraintDef>;

export function extensibleConstraint(
	constraint: AnyConstraint,
): ExtensibleConstraint {
	return constraintFromRef({
		kind: "extensibleConstraint",
		constraint: constraintRef(constraint),
	});
}
