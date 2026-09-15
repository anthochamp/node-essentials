import type { ObjectIdentifier } from "@ac-kit/format-oid";

import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** OBJECT IDENTIFIER type descriptor. */
export type Asn1ObjectIdentifierTypeDef = Asn1TypeDefBase<
	"objectIdentifier",
	ObjectIdentifier
>;

export type Asn1ObjectIdentifierType = Asn1Type<Asn1ObjectIdentifierTypeDef>;

export function objectIdentifierSchema(
	def: Asn1ObjectIdentifierTypeDef,
): Asn1ObjectIdentifierType {
	return wrapSchema(def, objectIdentifierSchema);
}

/** Factory: `OBJECT IDENTIFIER`. */
export function objectIdentifier(): Asn1ObjectIdentifierType {
	return objectIdentifierSchema({ kind: "objectIdentifier" });
}
