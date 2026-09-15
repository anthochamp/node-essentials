import type { AnyConstraintDef } from "./common.js";
import {
	constraintFromRef,
	constraintRef,
	type AnyConstraint,
} from "./common.js";

/** Set-arithmetic union over constraint operands. */
export type UnionConstraintDef = {
	readonly kind: "union";
	readonly operands: readonly AnyConstraintDef[];
};

/**
 * Algebraic union of constraints (`a | b | c`). Per X.680 §50.2 (ElementSetSpec
 * set arithmetic; UnionMark).
 */
export type UnionConstraint = AnyConstraint<UnionConstraintDef>;

export function unionConstraint(
	...operands: readonly AnyConstraint[]
): UnionConstraint {
	return constraintFromRef({
		kind: "union",
		operands: operands.map(constraintRef),
	});
}
