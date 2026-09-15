import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.680 regular-expression pattern (`PATTERN`) constraint. */
export type PatternConstraintDef = {
	readonly kind: "pattern";
	readonly pattern: string;
};

/**
 * X.680 pattern constraint (`PATTERN ...`). Per X.680 §51.9 (Pattern
 * constraint).
 */
export type PatternConstraint = AnyConstraint<PatternConstraintDef>;

export function patternConstraint(pattern: string): PatternConstraint {
	return constraintFromRef({ kind: "pattern", pattern });
}
