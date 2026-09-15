import type { AnyConstraintDef } from "../../constraints/common.js";
import { wrapSchema, type Asn1Type } from "../base.js";
import type {
	Asn1ChoiceComponentDescriptorDef,
	ChoiceAlternativesOutput,
	ChoiceComponentDescriptor,
	DescriptorTuple,
} from "./component.js";

/** CHOICE descriptor. */
export type Asn1ChoiceTypeDef<
	A extends readonly Asn1ChoiceComponentDescriptorDef[] = readonly any[],
> = {
	readonly kind: "choice";
	readonly alternatives: A;
	readonly constraints?: readonly AnyConstraintDef[];
	readonly __output?: ChoiceAlternativesOutput<A>;
	readonly __input?: ChoiceAlternativesOutput<A>;
};

export type Asn1ChoiceType<
	A extends readonly Asn1ChoiceComponentDescriptorDef[],
> = Asn1Type<Asn1ChoiceTypeDef<A>>;

export function choiceSchema<
	A extends readonly Asn1ChoiceComponentDescriptorDef[],
>(def: Asn1ChoiceTypeDef<A>): Asn1ChoiceType<A> {
	return wrapSchema(def, choiceSchema);
}

/** Factory: `CHOICE { ... }`. */
export function choice<A extends DescriptorTuple<ChoiceComponentDescriptor>>(
	alternatives: A,
): Asn1ChoiceType<A> {
	return choiceSchema({ kind: "choice", alternatives });
}
