import type { AnyConstraintDef } from "../../constraints/common.js";
import type { ValueRangeConstraintDef } from "../../constraints/value-range.js";
import type { Asn1TypeDefBase } from "../../def.js";
import type { NamedNumber } from "../../values.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** INTEGER type descriptor. */
export type Asn1IntegerTypeDef = Asn1TypeDefBase<"integer", bigint> & {
	readonly constraints?: readonly AnyConstraintDef[];
	readonly namedNumbers?: readonly NamedNumber[];
};

export type Asn1IntegerType = Asn1Type<Asn1IntegerTypeDef> & {
	/** Add a VALUE RANGE constraint. */
	range(
		min: bigint | number | "MIN",
		max: bigint | number | "MAX",
	): Asn1IntegerType;
	/** Attach named-number annotations. */
	namedNumbers(map: Readonly<Record<string, bigint | number>>): Asn1IntegerType;
};

export function integerSchema(def: Asn1IntegerTypeDef): Asn1IntegerType {
	return {
		...wrapSchema(def, integerSchema),
		range(min, max) {
			const c: ValueRangeConstraintDef = {
				kind: "valueRange",
				min: typeof min === "number" ? BigInt(min) : min,
				max: typeof max === "number" ? BigInt(max) : max,
			};
			return integerSchema({
				...def,
				constraints: [...(def.constraints ?? []), c],
			});
		},
		namedNumbers(map) {
			const named: NamedNumber[] = Object.entries(map).map(([name, value]) => ({
				name,
				value: typeof value === "number" ? BigInt(value) : value,
			}));
			return integerSchema({ ...def, namedNumbers: named });
		},
	};
}

/** Factory: `INTEGER`. */
export function integer(): Asn1IntegerType {
	return integerSchema({ kind: "integer" });
}
