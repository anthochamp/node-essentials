import type { Asn1TypeDefBase } from "../../def.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** Legacy CHARACTER STRING descriptor. */
export type Asn1CharacterStringTypeDef = Asn1TypeDefBase<
	"characterString",
	Uint8Array
>;

/** Decoded as opaque raw bytes. */
export type Asn1CharacterStringType = Asn1Type<Asn1CharacterStringTypeDef>;

export function characterStringSchema(
	def: Asn1CharacterStringTypeDef,
): Asn1CharacterStringType {
	return wrapSchema(def, characterStringSchema);
}

/** Factory: legacy `CHARACTER STRING`. */
export function characterString(): Asn1CharacterStringType {
	return characterStringSchema({ kind: "characterString" });
}
