import { wrapSchema, type Asn1Type } from "../base.js";
import {
	attachStringMethods,
	type Asn1StringKindDef,
	type StringMethods,
} from "./string-base.js";

/** IA5String descriptor. */
export type Asn1Ia5StringTypeDef = Asn1StringKindDef<"ia5String">;

export type Asn1Ia5StringType = Asn1Type<Asn1Ia5StringTypeDef> &
	StringMethods<Asn1Ia5StringType>;

export function ia5StringSchema(def: Asn1Ia5StringTypeDef): Asn1Ia5StringType {
	return {
		...wrapSchema(def, ia5StringSchema),
		...attachStringMethods(def, ia5StringSchema),
	};
}

/** Factory: `IA5String`. */
export function ia5String(): Asn1Ia5StringType {
	return ia5StringSchema({ kind: "ia5String" });
}
