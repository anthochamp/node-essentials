import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** BMPString descriptor. */
export type Asn1BmpStringTypeDef = Asn1StringKindDef<"bmpString">;

export type Asn1BmpStringType = Asn1Type<Asn1BmpStringTypeDef> &
	StringMethods<Asn1BmpStringType>;

export function bmpStringSchema(def: Asn1BmpStringTypeDef): Asn1BmpStringType {
	return {
		...wrapSchema(def, bmpStringSchema),
		...attachStringMethods(def, bmpStringSchema),
	};
}

/** Factory: `BMPString`. */
export function bmpString(): Asn1BmpStringType {
	return bmpStringSchema({ kind: "bmpString" });
}
