import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** VisibleString descriptor. */
export type Asn1VisibleStringTypeDef = Asn1StringKindDef<"visibleString">;

export type Asn1VisibleStringType = Asn1Type<Asn1VisibleStringTypeDef> &
	StringMethods<Asn1VisibleStringType>;

export function visibleStringSchema(
	def: Asn1VisibleStringTypeDef,
): Asn1VisibleStringType {
	return {
		...wrapSchema(def, visibleStringSchema),
		...attachStringMethods(def, visibleStringSchema),
	};
}

/** Factory: `VisibleString`. */
export function visibleString(): Asn1VisibleStringType {
	return visibleStringSchema({ kind: "visibleString" });
}
