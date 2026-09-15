import { wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1TimeKindDef } from "./common.js";

/** DURATION descriptor. */
export type Asn1DurationTypeDef = Asn1TimeKindDef<"duration">;

export type Asn1DurationType = Asn1Type<Asn1DurationTypeDef>;

export function durationSchema(def: Asn1DurationTypeDef): Asn1DurationType {
	return wrapSchema(def, durationSchema);
}

/** Factory: `DURATION`. */
export function duration(): Asn1DurationType {
	return durationSchema({ kind: "duration" });
}
