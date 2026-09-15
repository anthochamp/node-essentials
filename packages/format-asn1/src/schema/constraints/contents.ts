import { AnyAsn1TypeDef } from "../types/any-def.js";
import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.682 contents constraint (`CONTAINING` and optional `ENCODED BY`). */
export type ContentsConstraintDef = {
	readonly kind: "contentsConstraint";
	readonly containing: AnyAsn1TypeDef;
	readonly encodedBy?: readonly number[];
};

/**
 * X.682 `CONTAINING` / `ENCODED BY` constraint. Per X.682 §11 (Contents
 * constraints), especially §11.1. Takes a raw def (not a schema) to avoid a
 * circular import with `types/base.js`; callers holding a schema pass
 * `ref(mySchema)`.
 */
export type ContentsConstraint = AnyConstraint<ContentsConstraintDef>;

export function contentsConstraint(
	containing: AnyAsn1TypeDef,
	encodedBy?: readonly number[],
): ContentsConstraint {
	return constraintFromRef(
		encodedBy === undefined
			? { kind: "contentsConstraint", containing }
			: { kind: "contentsConstraint", containing, encodedBy },
	);
}
