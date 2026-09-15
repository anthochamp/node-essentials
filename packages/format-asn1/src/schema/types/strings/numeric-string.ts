import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** NumericString descriptor. */
export type Asn1NumericStringTypeDef = Asn1StringKindDef<"numericString">;

export type Asn1NumericStringType = Asn1Type<Asn1NumericStringTypeDef> &
	StringMethods<Asn1NumericStringType>;

export function numericStringSchema(
	def: Asn1NumericStringTypeDef,
): Asn1NumericStringType {
	return {
		...wrapSchema(def, numericStringSchema),
		...attachStringMethods(def, numericStringSchema),
	};
}

/** Factory: `NumericString`. */
export function numericString(): Asn1NumericStringType {
	return numericStringSchema({ kind: "numericString" });
}
