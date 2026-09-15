import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** TeletexString (T61String) descriptor. */
export type Asn1TeletexStringTypeDef = Asn1StringKindDef<"teletexString">;

export type Asn1TeletexStringType = Asn1Type<Asn1TeletexStringTypeDef> &
	StringMethods<Asn1TeletexStringType>;

export function teletexStringSchema(
	def: Asn1TeletexStringTypeDef,
): Asn1TeletexStringType {
	return {
		...wrapSchema(def, teletexStringSchema),
		...attachStringMethods(def, teletexStringSchema),
	};
}

/** Factory: `TeletexString`. */
export function teletexString(): Asn1TeletexStringType {
	return teletexStringSchema({ kind: "teletexString" });
}
