import { wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1TimeKindDef } from "./common.js";

/** DATE descriptor. */
export type Asn1DateTypeDef = Asn1TimeKindDef<"date">;

export type Asn1DateType = Asn1Type<Asn1DateTypeDef>;

export function dateSchema(def: Asn1DateTypeDef): Asn1DateType {
	return wrapSchema(def, dateSchema);
}

/** Factory: `DATE`. */
export function date(): Asn1DateType {
	return dateSchema({ kind: "date" });
}
