import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.682 user-defined textual constraint body. */
export type UserDefinedConstraintDef = {
	readonly kind: "userDefinedConstraint";
	readonly description: string;
};

/**
 * X.682 user-defined constraint (`CONSTRAINED BY { ... }`). Per X.682 §9
 * (User-defined constraints), especially §9.1.
 */
export type UserDefinedConstraint = AnyConstraint<UserDefinedConstraintDef>;

export function userDefinedConstraint(
	description: string,
): UserDefinedConstraint {
	return constraintFromRef({ kind: "userDefinedConstraint", description });
}
