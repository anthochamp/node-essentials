import { wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1TimeKindDef } from "./common.js";

/** TIME-OF-DAY descriptor. */
export type Asn1TimeOfDayTypeDef = Asn1TimeKindDef<"timeOfDay">;

export type Asn1TimeOfDayType = Asn1Type<Asn1TimeOfDayTypeDef>;

export function timeOfDaySchema(def: Asn1TimeOfDayTypeDef): Asn1TimeOfDayType {
	return wrapSchema(def, timeOfDaySchema);
}

/** Factory: `TIME-OF-DAY`. */
export function timeOfDay(): Asn1TimeOfDayType {
	return timeOfDaySchema({ kind: "timeOfDay" });
}
