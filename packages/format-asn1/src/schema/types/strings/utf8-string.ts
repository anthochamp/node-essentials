import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** UTF8String descriptor. */
export type Asn1Utf8StringTypeDef = Asn1StringKindDef<"utf8String">;

export type Asn1Utf8StringType = Asn1Type<Asn1Utf8StringTypeDef> &
	StringMethods<Asn1Utf8StringType>;

export function utf8StringSchema(
	def: Asn1Utf8StringTypeDef,
): Asn1Utf8StringType {
	return {
		...wrapSchema(def, utf8StringSchema),
		...attachStringMethods(def, utf8StringSchema),
	};
}

/** Factory: `UTF8String`. */
export function utf8String(): Asn1Utf8StringType {
	return utf8StringSchema({ kind: "utf8String" });
}
