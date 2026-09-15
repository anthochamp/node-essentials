import type { AnyConstraintDef } from "./common.js";
import {
	constraintFromRef,
	constraintRef,
	type AnyConstraint,
} from "./common.js";

/** X.680 `WITH COMPONENT` single inner-type constraint. */
export type WithComponentConstraintDef = {
	readonly kind: "withComponent";
	readonly constraint: AnyConstraintDef;
};

/**
 * X.680 `WITH COMPONENT` constraint for each element of OF types. Per X.680
 * §51.8 (Inner subtyping), especially §51.8.1 and §51.8.4.
 */
export type WithComponentConstraint = AnyConstraint<WithComponentConstraintDef>;

export function withComponentConstraint(
	constraint: AnyConstraint,
): WithComponentConstraint {
	return constraintFromRef({
		kind: "withComponent",
		constraint: constraintRef(constraint),
	});
}
