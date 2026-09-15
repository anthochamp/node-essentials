import type { Asn1TypeDefBase } from "../../def.js";
import type { AnyValue } from "../../values.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** Legacy `ANY` type descriptor. */
export type Asn1AnyTypeDef = Asn1TypeDefBase<"any", AnyValue>;

export type Asn1AnyType = Asn1Type<Asn1AnyTypeDef>;

export function anySchema(def: Asn1AnyTypeDef): Asn1AnyType {
	return wrapSchema(def, anySchema);
}

/** Factory: `ANY`. */
export function any(): Asn1AnyType {
	return anySchema({ kind: "any" });
}
