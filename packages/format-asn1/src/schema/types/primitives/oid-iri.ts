import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** OID-IRI type descriptor. */
export type Asn1OidIriTypeDef = Asn1TypeDefBase<"oidIri", string>;

export type Asn1OidIriType = Asn1Type<Asn1OidIriTypeDef>;

export function oidIriSchema(def: Asn1OidIriTypeDef): Asn1OidIriType {
	return wrapSchema(def, oidIriSchema);
}

/** Factory: `OID-IRI`. */
export function oidIri(): Asn1OidIriType {
	return oidIriSchema({ kind: "oidIri" });
}
