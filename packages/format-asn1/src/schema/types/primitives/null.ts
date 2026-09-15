import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** NULL type descriptor. */
export type Asn1NullTypeDef = Asn1TypeDefBase<"null", null>;

export type Asn1NullType = Asn1Type<Asn1NullTypeDef>;

export function nullSchema(def: Asn1NullTypeDef): Asn1NullType {
	return wrapSchema(def, nullSchema);
}

/** Singleton `NULL` schema. */
export const nullType: Asn1NullType = Object.freeze(
	nullSchema({ kind: "null" }),
);
