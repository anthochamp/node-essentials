import type { AnyConstraintDef } from "../../constraints/common.js";
import type { Asn1TypeDefBase } from "../../def.js";
import type { BitStringValue, NamedBit } from "../../values.js";
import { wrapSchema, type Asn1Type } from "../base.js";

/** BIT STRING type descriptor. */
export type Asn1BitStringTypeDef = Asn1TypeDefBase<
	"bitString",
	BitStringValue
> & {
	readonly constraints?: readonly AnyConstraintDef[];
	readonly namedBits?: readonly NamedBit[];
};

export type Asn1BitStringType = Asn1Type<Asn1BitStringTypeDef> & {
	/** Add a SIZE constraint. */
	size(
		minOrFixed: bigint | number,
		max?: bigint | number | "MAX",
	): Asn1BitStringType;
	/** Attach named-bit annotations. */
	namedBits(map: Readonly<Record<string, number>>): Asn1BitStringType;
};

export function bitStringSchema(def: Asn1BitStringTypeDef): Asn1BitStringType {
	return {
		...wrapSchema(def, bitStringSchema),
		size(minOrFixed, max) {
			return bitStringSchema({
				...def,
				constraints: [
					...(def.constraints ?? []),
					{
						kind: "size",
						min:
							typeof minOrFixed === "number" ? BigInt(minOrFixed) : minOrFixed,
						max:
							max === undefined
								? typeof minOrFixed === "number"
									? BigInt(minOrFixed)
									: minOrFixed
								: max === "MAX"
									? "MAX"
									: typeof max === "number"
										? BigInt(max)
										: max,
					},
				],
			});
		},
		namedBits(map) {
			const named: NamedBit[] = Object.entries(map).map(([name, index]) => ({
				name,
				index,
			}));
			return bitStringSchema({ ...def, namedBits: named });
		},
	};
}

/** Factory: `BIT STRING`. */
export function bitString(): Asn1BitStringType {
	return bitStringSchema({ kind: "bitString" });
}
