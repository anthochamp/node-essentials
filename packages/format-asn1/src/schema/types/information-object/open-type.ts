import type { ComponentRelationConstraintDef } from "../../constraints/component-relation.js";
import type { TableConstraintDef } from "../../constraints/table.js";
import type { Asn1TypeDefBase } from "../../def.js";
import { ref, wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1ClassType, Asn1ClassTypeDef } from "./class.js";
import type { Asn1InformationObjectSetType } from "./information-object.js";

/** X.681 open-type descriptor. */
export type Asn1OpenTypeDef = Asn1TypeDefBase<"openType", unknown> & {
	readonly class: Asn1ClassTypeDef;
	readonly typeFieldRef: string;
	readonly tableConstraint?: TableConstraintDef;
	readonly componentRelationConstraint?: ComponentRelationConstraintDef;
};

/** Schema for an X.681 open type (variable-type value field reference). */
export type Asn1OpenType = Asn1Type<Asn1OpenTypeDef> & {
	/** Add a table constraint. */
	tableConstraint(set: Asn1InformationObjectSetType<any, any>): Asn1OpenType;
	/** Add a component relation constraint. */
	componentRelationConstraint(
		set: Asn1InformationObjectSetType<any, any>,
		atComponents: readonly string[],
	): Asn1OpenType;
};

export function openTypeSchema(def: Asn1OpenTypeDef): Asn1OpenType {
	return {
		...wrapSchema(def, openTypeSchema),
		tableConstraint(set) {
			const tc: TableConstraintDef = {
				kind: "tableConstraint",
				objectSet: ref(set),
			};
			return openTypeSchema({ ...def, tableConstraint: tc });
		},
		componentRelationConstraint(set, atComponents) {
			const crc: ComponentRelationConstraintDef = {
				kind: "componentRelationConstraint",
				objectSet: ref(set),
				atComponents,
			};
			return openTypeSchema({ ...def, componentRelationConstraint: crc });
		},
	};
}

/** Factory: create an open type. */
export function openType(
	cls: Asn1ClassType<any>,
	typeFieldRef: string,
): Asn1OpenType {
	return openTypeSchema({
		kind: "openType",
		class: ref(cls),
		typeFieldRef,
	});
}
