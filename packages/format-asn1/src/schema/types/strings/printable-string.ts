import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** PrintableString descriptor. */
export type Asn1PrintableStringTypeDef = Asn1StringKindDef<"printableString">;

export type Asn1PrintableStringType = Asn1Type<Asn1PrintableStringTypeDef> &
	StringMethods<Asn1PrintableStringType>;

export function printableStringSchema(
	def: Asn1PrintableStringTypeDef,
): Asn1PrintableStringType {
	return {
		...wrapSchema(def, printableStringSchema),
		...attachStringMethods(def, printableStringSchema),
	};
}

/** Factory: `PrintableString`. */
export function printableString(): Asn1PrintableStringType {
	return printableStringSchema({ kind: "printableString" });
}
