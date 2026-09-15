import type { ConstraintEndpoint } from "./common.js";
import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.680 value range constraint. */
export type ValueRangeConstraintDef = {
	readonly kind: "valueRange";
	readonly min: ConstraintEndpoint;
	readonly max: ConstraintEndpoint;
};

/** X.680 value-range constraint, e.g. `(0..255)`. Per X.680 §51.4 (Value range). */
export type ValueRangeConstraint = AnyConstraint<ValueRangeConstraintDef>;

export function valueRangeConstraint(
	min: ConstraintEndpoint,
	max: ConstraintEndpoint,
): ValueRangeConstraint {
	return constraintFromRef({ kind: "valueRange", min, max });
}
