import type { Asn1TypeDefBase } from "../../def.js";
import type { GeneralizedTimeValue } from "../../values.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** GeneralizedTime descriptor. */
export type Asn1GeneralizedTimeTypeDef = Asn1TypeDefBase<
	"generalizedTime",
	GeneralizedTimeValue
>;

export type Asn1GeneralizedTimeType = Asn1Type<Asn1GeneralizedTimeTypeDef>;

export function generalizedTimeSchema(
	def: Asn1GeneralizedTimeTypeDef,
): Asn1GeneralizedTimeType {
	return wrapSchema(def, generalizedTimeSchema);
}

/** Factory: `GeneralizedTime`. */
export function generalizedTime(): Asn1GeneralizedTimeType {
	return generalizedTimeSchema({ kind: "generalizedTime" });
}
