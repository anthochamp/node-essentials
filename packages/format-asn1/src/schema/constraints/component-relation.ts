import type { Asn1InformationObjectSetTypeDef } from "../types/information-object/information-object.js";
import { constraintFromRef, type AnyConstraint } from "./common.js";

/** X.682 component relation constraint (`@component` paths). */
export type ComponentRelationConstraintDef = {
	readonly kind: "componentRelationConstraint";
	readonly objectSet: Asn1InformationObjectSetTypeDef;
	readonly atComponents: readonly string[];
};

/**
 * X.682 component relation constraint (`@component` paths over an object set).
 * Per X.682 §10.7 (Component relation constraints). Takes a raw def — see
 * `contentsConstraint`.
 */
export type ComponentRelationConstraint =
	AnyConstraint<ComponentRelationConstraintDef>;

export function componentRelationConstraint(
	objectSet: Asn1InformationObjectSetTypeDef,
	atComponents: readonly string[],
): ComponentRelationConstraint {
	return constraintFromRef({
		kind: "componentRelationConstraint",
		objectSet,
		atComponents,
	});
}
