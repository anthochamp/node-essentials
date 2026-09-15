import type { RelativeObjectIdentifier } from "@ac-kit/format-oid";

import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** RELATIVE-OID type descriptor. */
export type Asn1RelativeOidTypeDef = Asn1TypeDefBase<
	"relativeOid",
	RelativeObjectIdentifier
>;

export type Asn1RelativeOidType = Asn1Type<Asn1RelativeOidTypeDef>;

export function relativeOidSchema(
	def: Asn1RelativeOidTypeDef,
): Asn1RelativeOidType {
	return wrapSchema(def, relativeOidSchema);
}

/** Factory: `RELATIVE-OID`. */
export function relativeOid(): Asn1RelativeOidType {
	return relativeOidSchema({ kind: "relativeOid" });
}
