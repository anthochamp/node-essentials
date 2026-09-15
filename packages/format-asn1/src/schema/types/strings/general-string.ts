import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** GeneralString descriptor. */
export type Asn1GeneralStringTypeDef = Asn1StringKindDef<"generalString">;

export type Asn1GeneralStringType = Asn1Type<Asn1GeneralStringTypeDef> &
	StringMethods<Asn1GeneralStringType>;

export function generalStringSchema(
	def: Asn1GeneralStringTypeDef,
): Asn1GeneralStringType {
	return {
		...wrapSchema(def, generalStringSchema),
		...attachStringMethods(def, generalStringSchema),
	};
}

/** Factory: `GeneralString`. */
export function generalString(): Asn1GeneralStringType {
	return generalStringSchema({ kind: "generalString" });
}
