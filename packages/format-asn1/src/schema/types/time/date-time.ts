import { wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1TimeKindDef } from "./common.js";

/** DATE-TIME descriptor. */
export type Asn1DateTimeTypeDef = Asn1TimeKindDef<"dateTime">;

export type Asn1DateTimeType = Asn1Type<Asn1DateTimeTypeDef>;

export function dateTimeSchema(def: Asn1DateTimeTypeDef): Asn1DateTimeType {
	return wrapSchema(def, dateTimeSchema);
}

/** Factory: `DATE-TIME`. */
export function dateTime(): Asn1DateTimeType {
	return dateTimeSchema({ kind: "dateTime" });
}
