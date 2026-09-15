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

/** SET descriptor. */
export type Asn1SetTypeDef<
	C extends readonly Asn1SequenceComponentDescriptorDef[] = readonly any[],
> = {
	readonly kind: "set";
	readonly components: C;
	readonly constraints?: readonly AnyConstraintDef[];
	readonly __output?: SequenceMembersOutput<C>;
	readonly __input?: SequenceMembersOutput<C>;
};

export type Asn1SetType<
	C extends readonly Asn1SequenceComponentDescriptorDef[],
> = Asn1Type<Asn1SetTypeDef<C>>;

export function setSchema<
	C extends readonly Asn1SequenceComponentDescriptorDef[],
>(def: Asn1SetTypeDef<C>): Asn1SetType<C> {
	return wrapSchema(def, setSchema);
}

/** Factory: `SET { ... }`. */
export function set<C extends DescriptorTuple<SequenceComponentDescriptor>>(
	components: C,
): Asn1SetType<SequenceComponentDescriptorsDef<C>> {
	return setSchema({
		kind: "set",
		components: toSequenceComponentDescriptorsDef(components),
	});
}
