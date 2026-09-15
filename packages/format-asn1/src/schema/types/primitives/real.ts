import type { AnyConstraintDef } from "../../constraints/common.js";
import type { Asn1TypeDefBase } from "../../def.js";
import type { RealValue } from "../../values.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** REAL type descriptor. */
export type Asn1RealTypeDef = Asn1TypeDefBase<"real", RealValue> & {
	readonly constraints?: readonly AnyConstraintDef[];
};

export type Asn1RealType = Asn1Type<Asn1RealTypeDef> & {
	/** Add a VALUE RANGE constraint. */
	range(
		min: bigint | number | "MIN",
		max: bigint | number | "MAX",
	): Asn1RealType;
};

export function realSchema(def: Asn1RealTypeDef): Asn1RealType {
	return {
		...wrapSchema(def, realSchema),
		range(min, max) {
			return realSchema({
				...def,
				constraints: [
					...(def.constraints ?? []),
					{
						kind: "valueRange",
						min: typeof min === "number" ? BigInt(min) : min,
						max: typeof max === "number" ? BigInt(max) : max,
					},
				],
			});
		},
	};
}

/** Factory: `REAL`. */
export function real(): Asn1RealType {
	return realSchema({ kind: "real" });
}
