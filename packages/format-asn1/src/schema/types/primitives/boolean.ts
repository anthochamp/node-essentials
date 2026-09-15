import type { AnyConstraintDef } from "../../constraints/common.js";
import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** BOOLEAN type descriptor. */
export type Asn1BooleanTypeDef = Asn1TypeDefBase<"boolean", boolean> & {
	readonly constraints?: readonly AnyConstraintDef[];
};

export type Asn1BooleanType = Asn1Type<Asn1BooleanTypeDef>;

export function booleanSchema(def: Asn1BooleanTypeDef): Asn1BooleanType {
	return wrapSchema(def, booleanSchema);
}

/** Factory: `BOOLEAN`. */
export function boolean(): Asn1BooleanType {
	return booleanSchema({ kind: "boolean" });
}
