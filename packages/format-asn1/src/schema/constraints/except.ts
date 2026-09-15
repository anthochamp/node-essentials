import type { AnyConstraintDef } from "./common.js";
import {
	constraintFromRef,
	constraintRef,
	type AnyConstraint,
} from "./common.js";

/** Set-arithmetic subtraction (`base EXCEPT excluded`). */
export type ExceptConstraintDef = {
	readonly kind: "except";
	readonly base: AnyConstraintDef;
	readonly excluded: AnyConstraintDef;
};

/**
 * Algebraic subtraction of constraints (`base EXCEPT excluded`). Per X.680
 * §50.2 (ElementSetSpec set arithmetic; Exclusions using `EXCEPT`).
 */
export type ExceptConstraint = AnyConstraint<ExceptConstraintDef>;

export function exceptConstraint(
	base: AnyConstraint,
	excluded: AnyConstraint,
): ExceptConstraint {
	return constraintFromRef({
		kind: "except",
		base: constraintRef(base),
		excluded: constraintRef(excluded),
	});
}
