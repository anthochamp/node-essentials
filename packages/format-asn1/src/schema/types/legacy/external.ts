import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** Legacy EXTERNAL descriptor. */
export type Asn1ExternalTypeDef = Asn1TypeDefBase<"external", Uint8Array>;

/** Decoded as opaque raw bytes. */
export type Asn1ExternalType = Asn1Type<Asn1ExternalTypeDef>;

export function externalSchema(def: Asn1ExternalTypeDef): Asn1ExternalType {
	return wrapSchema(def, externalSchema);
}

/** Factory: legacy `EXTERNAL`. */
export function external(): Asn1ExternalType {
	return externalSchema({ kind: "external" });
}
