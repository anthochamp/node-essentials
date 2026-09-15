import type { Asn1TypeDefBase } from "../../def.js";
import type { UtcTimeValue } from "../../values.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** UTCTime descriptor. */
export type Asn1UtcTimeTypeDef = Asn1TypeDefBase<"utcTime", UtcTimeValue>;

export type Asn1UtcTimeType = Asn1Type<Asn1UtcTimeTypeDef>;

export function utcTimeSchema(def: Asn1UtcTimeTypeDef): Asn1UtcTimeType {
	return wrapSchema(def, utcTimeSchema);
}

/** Factory: `UTCTime`. */
export function utcTime(): Asn1UtcTimeType {
	return utcTimeSchema({ kind: "utcTime" });
}
