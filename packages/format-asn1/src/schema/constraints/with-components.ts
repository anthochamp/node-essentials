import type { WithComponentsEntry } from "./common.js";
import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.680 `WITH COMPONENTS` multi-component inner constraint. */
export type WithComponentsConstraintDef = {
	readonly kind: "withComponents";
	readonly partial: boolean;
	readonly components: Readonly<Record<string, WithComponentsEntry>>;
};

/**
 * X.680 `WITH COMPONENTS` constraint for SEQUENCE/SET/CHOICE-like structures.
 * Per X.680 §51.8 (Inner subtyping), especially §51.8.5 through §51.8.10.
 */
export type WithComponentsConstraint =
	AnyConstraint<WithComponentsConstraintDef>;

export function withComponentsConstraint(
	components: Readonly<Record<string, WithComponentsEntry>>,
	partial = true,
): WithComponentsConstraint {
	return constraintFromRef({ kind: "withComponents", partial, components });
}
