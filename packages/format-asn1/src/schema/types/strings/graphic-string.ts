import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** GraphicString descriptor. */
export type Asn1GraphicStringTypeDef = Asn1StringKindDef<"graphicString">;

export type Asn1GraphicStringType = Asn1Type<Asn1GraphicStringTypeDef> &
	StringMethods<Asn1GraphicStringType>;

export function graphicStringSchema(
	def: Asn1GraphicStringTypeDef,
): Asn1GraphicStringType {
	return {
		...wrapSchema(def, graphicStringSchema),
		...attachStringMethods(def, graphicStringSchema),
	};
}

/** Factory: `GraphicString`. */
export function graphicString(): Asn1GraphicStringType {
	return graphicStringSchema({ kind: "graphicString" });
}
