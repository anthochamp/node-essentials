import type { AnyConstraintDef } from "../../constraints/common.js";
import { DefValueOf } from "../../def.js";
import { AnyAsn1TypeDef } from "../any-def.js";
import { ref, wrapSchema, type Asn1Type } from "../base.js";

/** SET OF descriptor. */
export type Asn1SetOfTypeDef<E extends AnyAsn1TypeDef = any> = {
	readonly kind: "setOf";
	readonly elementType: E;
	readonly constraints?: readonly AnyConstraintDef[];
	readonly __output?: ReadonlyArray<DefValueOf<E>>;
	readonly __input?: ReadonlyArray<DefValueOf<E>>;
};

export type Asn1SetOfType<E extends AnyAsn1TypeDef> = Asn1Type<
	Asn1SetOfTypeDef<E>
> & {
	/** Add a SIZE constraint. */
	size(
		minOrFixed: bigint | number,
		max?: bigint | number | "MAX",
	): Asn1SetOfType<E>;
};

export function setOfSchema<E extends AnyAsn1TypeDef>(
	def: Asn1SetOfTypeDef<E>,
): Asn1SetOfType<E> {
	return {
		...wrapSchema(def, setOfSchema),
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
			return setOfSchema({
				...def,
				constraints: [
					...(def.constraints ?? []),
					{ kind: "size", min: minVal, max: maxVal },
				],
			});
		},
	};
}

/** Factory: `SET OF T`. */
export function setOf<T extends AnyAsn1TypeDef>(
	elementSchema: Asn1Type<T>,
): Asn1SetOfType<T> {
	return setOfSchema({ kind: "setOf", elementType: ref(elementSchema) });
}
