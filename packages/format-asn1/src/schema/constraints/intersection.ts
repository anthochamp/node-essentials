import type { AnyConstraintDef } from "./common.js";
import {
	constraintFromRef,
	constraintRef,
	type AnyConstraint,
} from "./common.js";

/** Set-arithmetic intersection over constraint operands. */
export type IntersectionConstraintDef = {
	readonly kind: "intersection";
	readonly operands: readonly AnyConstraintDef[];
};

/**
 * Algebraic intersection of constraints (`a ^ b ^ c`). Per X.680 §50.2
 * (ElementSetSpec set arithmetic; IntersectionMark).
 */
export type IntersectionConstraint = AnyConstraint<IntersectionConstraintDef>;

export function intersectionConstraint(
	...operands: readonly AnyConstraint[]
): IntersectionConstraint {
	return constraintFromRef({
		kind: "intersection",
		operands: operands.map(constraintRef),
	});
}
