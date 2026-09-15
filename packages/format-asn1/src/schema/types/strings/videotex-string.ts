import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** VideotexString descriptor. */
export type Asn1VideotexStringTypeDef = Asn1StringKindDef<"videotexString">;

export type Asn1VideotexStringType = Asn1Type<Asn1VideotexStringTypeDef> &
	StringMethods<Asn1VideotexStringType>;

export function videotexStringSchema(
	def: Asn1VideotexStringTypeDef,
): Asn1VideotexStringType {
	return {
		...wrapSchema(def, videotexStringSchema),
		...attachStringMethods(def, videotexStringSchema),
	};
}

/** Factory: `VideotexString`. */
export function videotexString(): Asn1VideotexStringType {
	return videotexStringSchema({ kind: "videotexString" });
}
