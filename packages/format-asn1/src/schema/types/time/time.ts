import { wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1TimeKindDef } from "./common.js";

/** TIME descriptor. */
export type Asn1TimeTypeDef = Asn1TimeKindDef<"time">;

export type Asn1TimeType = Asn1Type<Asn1TimeTypeDef>;

export function timeSchema(def: Asn1TimeTypeDef): Asn1TimeType {
	return wrapSchema(def, timeSchema);
}

/** Factory: `TIME`. */
export function time(): Asn1TimeType {
	return timeSchema({ kind: "time" });
}
