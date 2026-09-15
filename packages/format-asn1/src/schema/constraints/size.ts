import type { ConstraintEndpoint } from "./common.js";
import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.680 size constraint. */
export type SizeConstraintDef = {
	readonly kind: "size";
	readonly min: ConstraintEndpoint;
	readonly max: ConstraintEndpoint;
};

/**
 * X.680 size constraint, e.g. `SIZE(1..MAX)`. Per X.680 §51.5 (Size
 * constraint).
 */
export type SizeConstraint = AnyConstraint<SizeConstraintDef>;

export function sizeConstraint(
	min: ConstraintEndpoint,
	max: ConstraintEndpoint,
): SizeConstraint {
	return constraintFromRef({ kind: "size", min, max });
}
