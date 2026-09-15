import type { AnyConstraintDef } from "../../constraints/common.js";
import { wrapSchema, type Asn1Type } from "../base.js";
import {
	toSequenceComponentDescriptorsDef,
	type Asn1SequenceComponentDescriptorDef,
	type DescriptorTuple,
	type SequenceComponentDescriptor,
	type SequenceComponentDescriptorsDef,
	type SequenceMembersOutput,
} from "./component.js";

/** SEQUENCE descriptor. */
export type Asn1SequenceTypeDef<
	C extends readonly Asn1SequenceComponentDescriptorDef[] = readonly any[],
> = {
	readonly kind: "sequence";
	readonly components: C;
	readonly constraints?: readonly AnyConstraintDef[];
	readonly __output?: SequenceMembersOutput<C>;
	readonly __input?: SequenceMembersOutput<C>;
};

export type Asn1SequenceType<
	C extends readonly Asn1SequenceComponentDescriptorDef[],
> = Asn1Type<Asn1SequenceTypeDef<C>>;

export function sequenceSchema<
	C extends readonly Asn1SequenceComponentDescriptorDef[],
>(def: Asn1SequenceTypeDef<C>): Asn1SequenceType<C> {
	return wrapSchema(def, sequenceSchema);
}

/** Factory: `SEQUENCE { ... }`. */
export function sequence<
	C extends DescriptorTuple<SequenceComponentDescriptor>,
>(components: C): Asn1SequenceType<SequenceComponentDescriptorsDef<C>> {
	return sequenceSchema({
		kind: "sequence",
		components: toSequenceComponentDescriptorsDef(components),
	});
}
