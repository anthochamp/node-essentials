import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.680 permitted alphabet (`FROM`) constraint. */
export type PermittedAlphabetConstraintDef = {
	readonly kind: "permittedAlphabet";
	readonly alphabet: string;
};

/**
 * X.680 permitted alphabet constraint (`FROM(...)`). Per X.680 §51.7 (Permitted
 * alphabet).
 */
export type PermittedAlphabetConstraint =
	AnyConstraint<PermittedAlphabetConstraintDef>;

export function permittedAlphabetConstraint(
	alphabet: string,
): PermittedAlphabetConstraint {
	return constraintFromRef({ kind: "permittedAlphabet", alphabet });
}
