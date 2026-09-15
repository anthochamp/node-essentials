import type { AnyConstraintDef } from "../../constraints/common.js";
import { Asn1TypeDefBase } from "../../def.js";
import { AnyAsn1TypeDef } from "../any-def.js";
import { ref, wrapSchema, type Asn1Type } from "../base.js";

/** OCTET STRING type descriptor. */
export type Asn1OctetStringTypeDef = Asn1TypeDefBase<
	"octetString",
	Uint8Array
> & {
	readonly constraints?: readonly AnyConstraintDef[];
};

export type Asn1OctetStringType = Asn1Type<Asn1OctetStringTypeDef> & {
	/** Add a SIZE constraint. */
	size(
		minOrFixed: bigint | number,
		max?: bigint | number | "MAX",
	): Asn1OctetStringType;
	/** Add a CONTAINING constraint. */
	containing(inner: Asn1Type<AnyAsn1TypeDef>): Asn1OctetStringType;
	/** Add a CONTAINING … ENCODED BY constraint. */
	containingEncodedBy(
		inner: Asn1Type<AnyAsn1TypeDef>,
		encodingOid: readonly number[],
	): Asn1OctetStringType;
};

export function octetStringSchema(
	def: Asn1OctetStringTypeDef,
): Asn1OctetStringType {
	return {
		...wrapSchema(def, octetStringSchema),
		size(minOrFixed, max) {
			return octetStringSchema({
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
		containing(inner) {
			return octetStringSchema({
				...def,
				constraints: [
					...(def.constraints ?? []),
					{ kind: "contentsConstraint", containing: ref(inner) },
				],
			});
		},
		containingEncodedBy(inner, encodingOid) {
			return octetStringSchema({
				...def,
				constraints: [
					...(def.constraints ?? []),
					{
						kind: "contentsConstraint",
						containing: ref(inner),
						encodedBy: encodingOid,
					},
				],
			});
		},
	};
}

/** Factory: `OCTET STRING`. */
export function octetString(): Asn1OctetStringType {
	return octetStringSchema({ kind: "octetString" });
}
