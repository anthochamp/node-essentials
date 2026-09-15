import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** RELATIVE-OID-IRI type descriptor. */
export type Asn1RelativeOidIriTypeDef = Asn1TypeDefBase<
	"relativeOidIri",
	string
>;

export type Asn1RelativeOidIriType = Asn1Type<Asn1RelativeOidIriTypeDef>;

export function relativeOidIriSchema(
	def: Asn1RelativeOidIriTypeDef,
): Asn1RelativeOidIriType {
	return wrapSchema(def, relativeOidIriSchema);
}

/** Factory: `RELATIVE-OID-IRI`. */
export function relativeOidIri(): Asn1RelativeOidIriType {
	return relativeOidIriSchema({ kind: "relativeOidIri" });
}
