import type { AnyConstraintDef } from "../../constraints/common.js";
import { DefValueOf } from "../../def.js";
import { AnyAsn1TypeDef } from "../any-def.js";
import { ref, wrapSchema, type Asn1Type } from "../base.js";

/** SEQUENCE OF descriptor. */
export type Asn1SequenceOfTypeDef<E extends AnyAsn1TypeDef = any> = {
	readonly kind: "sequenceOf";
	readonly elementType: E;
	readonly constraints?: readonly AnyConstraintDef[];
	readonly __output?: ReadonlyArray<DefValueOf<E>>;
	readonly __input?: ReadonlyArray<DefValueOf<E>>;
};

export type Asn1SequenceOfType<E extends AnyAsn1TypeDef> = Asn1Type<
	Asn1SequenceOfTypeDef<E>
> & {
	/** Add a SIZE constraint. */
	size(
		minOrFixed: bigint | number,
		max?: bigint | number | "MAX",
	): Asn1SequenceOfType<E>;
};

export function sequenceOfSchema<E extends AnyAsn1TypeDef>(
	def: Asn1SequenceOfTypeDef<E>,
): Asn1SequenceOfType<E> {
	return {
		...wrapSchema(def, sequenceOfSchema),
		size(minOrFixed, max) {
			const minVal =
				typeof minOrFixed === "number" ? BigInt(minOrFixed) : minOrFixed;
			const maxVal =
				max === undefined
					? minVal
					: max === "MAX"
						? "MAX"
						: typeof max === "number"
							? BigInt(max)
							: max;
			return sequenceOfSchema({
				...def,
				constraints: [
					...(def.constraints ?? []),
					{ kind: "size", min: minVal, max: maxVal },
				],
			});
		},
	};
}

/** Factory: `SEQUENCE OF T`. */
export function sequenceOf<T extends AnyAsn1TypeDef>(
	elementSchema: Asn1Type<T>,
): Asn1SequenceOfType<T> {
	return sequenceOfSchema({
		kind: "sequenceOf",
		elementType: ref(elementSchema),
	});
}
