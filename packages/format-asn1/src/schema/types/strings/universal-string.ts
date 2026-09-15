import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** UniversalString descriptor. */
export type Asn1UniversalStringTypeDef = Asn1StringKindDef<"universalString">;

export type Asn1UniversalStringType = Asn1Type<Asn1UniversalStringTypeDef> &
	StringMethods<Asn1UniversalStringType>;

export function universalStringSchema(
	def: Asn1UniversalStringTypeDef,
): Asn1UniversalStringType {
	return {
		...wrapSchema(def, universalStringSchema),
		...attachStringMethods(def, universalStringSchema),
	};
}

/** Factory: `UniversalString`. */
export function universalString(): Asn1UniversalStringType {
	return universalStringSchema({ kind: "universalString" });
}
