import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** Legacy EMBEDDED PDV descriptor. */
export type Asn1EmbeddedPdvTypeDef = Asn1TypeDefBase<"embeddedPdv", Uint8Array>;

/** Decoded as opaque raw bytes. */
export type Asn1EmbeddedPdvType = Asn1Type<Asn1EmbeddedPdvTypeDef>;

export function embeddedPdvSchema(
	def: Asn1EmbeddedPdvTypeDef,
): Asn1EmbeddedPdvType {
	return wrapSchema(def, embeddedPdvSchema);
}

/** Factory: legacy `EMBEDDED PDV`. */
export function embeddedPdv(): Asn1EmbeddedPdvType {
	return embeddedPdvSchema({ kind: "embeddedPdv" });
}
