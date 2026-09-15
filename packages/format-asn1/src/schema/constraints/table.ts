import type { Asn1InformationObjectSetTypeDef } from "../types/information-object/information-object.js";
import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.682 table constraint tied to an information object set. */
export type TableConstraintDef = {
	readonly kind: "tableConstraint";
	readonly objectSet: Asn1InformationObjectSetTypeDef;
};

/**
 * X.682 table constraint over an information object set. Per X.682 §10 (Table
 * constraints), especially §10.1. Takes a raw def — see `contentsConstraint`.
 */
export type TableConstraint = AnyConstraint<TableConstraintDef>;

export function tableConstraint(
	objectSet: Asn1InformationObjectSetTypeDef,
): TableConstraint {
	return constraintFromRef({ kind: "tableConstraint", objectSet });
}
