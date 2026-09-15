import { DefValueOf } from "../../def.js";
import { AnyAsn1TypeDef } from "../any-def.js";
import { ref, type Asn1Type } from "../base.js";

// ── Component ─────────────────────────────────────────────────────────────────
// Component's own def is hidden behind a symbol too: `optional: boolean` is a
// real def field, and it would collide with an `.optional()` chaining method
// if flattened onto the same object.

const COMPONENT_DEF = Symbol("asn1ComponentDef");

/** Named SEQUENCE/SET component descriptor. */
export type Asn1ComponentDef<
	N extends string = string,
	T extends AnyAsn1TypeDef = any,
	Opt extends boolean = boolean,
> = {
	readonly kind: "component";
	readonly name: N;
	readonly type: T;
	readonly optional: Opt;
	readonly defaultValue?: DefValueOf<T>;
};

/**
 * Descriptor for a named SEQUENCE or SET component. `Asn1ComponentDef`'s own
 * generics (`N`/`T`/`Opt`) already carry the literal name/type/optionality —
 * this only adds `.optional()`/`.default()` chaining.
 */
export type Asn1Component<
	N extends string,
	T extends AnyAsn1TypeDef,
	Opt extends boolean = false,
> = Readonly<Record<typeof COMPONENT_DEF, Asn1ComponentDef<N, T, Opt>>> & {
	/** Mark this component as OPTIONAL. */
	optional(): Asn1Component<N, T, true>;
	/** Mark this component as OPTIONAL with a DEFAULT value. */
	default(v: DefValueOf<T>): Asn1Component<N, T, true>;
};

/** Extract the raw component def from a component descriptor. */
export function componentRef<
	N extends string,
	T extends AnyAsn1TypeDef,
	Opt extends boolean,
>(c: Asn1Component<N, T, Opt>): Asn1ComponentDef<N, T, Opt> {
	return c[COMPONENT_DEF];
}

function componentType<
	N extends string,
	T extends AnyAsn1TypeDef,
	Opt extends boolean,
>(def: Asn1ComponentDef<N, T, Opt>): Asn1Component<N, T, Opt> {
	return {
		[COMPONENT_DEF]: def,
		optional: () => componentType({ ...def, optional: true }),
		default: (v) => componentType({ ...def, optional: true, defaultValue: v }),
	};
}

/** Create a named SEQUENCE/SET component descriptor. */
export function component<N extends string, T extends AnyAsn1TypeDef>(
	name: N,
	schema: Asn1Type<T>,
): Asn1Component<N, T, false> {
	return componentType({
		kind: "component",
		name,
		type: ref(schema),
		optional: false,
	});
}

// ── Alternative ───────────────────────────────────────────────────────────────

/** CHOICE alternative descriptor. */
export type Asn1AlternativeDef<
	N extends string = string,
	T extends AnyAsn1TypeDef = any,
> = {
	readonly name: N;
	readonly type: T;
};

/** Descriptor for a named CHOICE alternative — plain data, no chaining. */
export type Asn1Alternative<
	N extends string,
	T extends AnyAsn1TypeDef,
> = Asn1AlternativeDef<N, T>;

/** Create a named CHOICE alternative descriptor. */
export function alternative<N extends string, T extends AnyAsn1TypeDef>(
	name: N,
	schema: Asn1Type<T>,
): Asn1Alternative<N, T> {
	return { name, type: ref(schema) };
}

// ── ComponentsOf ─────────────────────────────────────────────────────────────

/** `COMPONENTS OF` reference descriptor. */
export type Asn1ComponentsOfRefDef = {
	readonly kind: "componentsOf";
	readonly type: AnyAsn1TypeDef;
};

/** Descriptor for a `COMPONENTS OF` reference in a SEQUENCE or SET. */
export type Asn1ComponentsOf = Asn1ComponentsOfRefDef;

/** Create a `COMPONENTS OF` reference descriptor. */
export function componentsOf(base: Asn1Type<AnyAsn1TypeDef>): Asn1ComponentsOf {
	return { kind: "componentsOf", type: ref(base) };
}

// ── ExtensionMarker ───────────────────────────────────────────────────────────

/** Extension marker descriptor (`...`). */
export type Asn1ExtensionMarkerDef = {
	readonly kind: "extensionMarker";
};

/** Descriptor for the `...` extension marker in a SEQUENCE, SET, or CHOICE. */
export type Asn1ExtensionMarker = Asn1ExtensionMarkerDef;

/** Singleton `...` extension marker. */
export const extensionMarker: Asn1ExtensionMarker = { kind: "extensionMarker" };

// ── ExtensionAdditionGroup ────────────────────────────────────────────────────

/** Extension addition group descriptor (`[[n: ...]]`). */
export type Asn1ExtensionAdditionGroupDef = {
	readonly kind: "extensionAdditionGroup";
	readonly version?: number;
	readonly components: readonly Asn1ComponentDef[];
};

/** Descriptor for an extension addition group `[[ version: ... ]]`. */
export type Asn1ExtensionAdditionGroup = Asn1ExtensionAdditionGroupDef;

/** Create an extension addition group descriptor. */
export function extensionAdditionGroup(
	version: number | undefined,
	members: readonly Asn1Component<string, AnyAsn1TypeDef, boolean>[],
): Asn1ExtensionAdditionGroup {
	return {
		kind: "extensionAdditionGroup",
		...(version !== undefined ? { version } : {}),
		components: members.map((m) => componentRef(m)),
	};
}

// ── Type inference helpers ────────────────────────────────────────────────────

/** Descriptor items accepted by `sequence` and `set` def descriptors. */
export type Asn1SequenceComponentDescriptorDef =
	| Asn1ComponentDef
	| Asn1ComponentsOfRefDef
	| Asn1ExtensionMarkerDef
	| Asn1ExtensionAdditionGroupDef;

/** Descriptor items accepted by `choice` def descriptors. */
export type Asn1ChoiceComponentDescriptorDef =
	| Asn1AlternativeDef
	| Asn1ExtensionMarkerDef
	| Asn1ExtensionAdditionGroupDef;

/** Descriptor items accepted in a `sequence([...])` or `set([...])` call. */
export type SequenceComponentDescriptor =
	| Asn1Component<string, AnyAsn1TypeDef, boolean>
	| Asn1ComponentsOf
	| Asn1ExtensionMarker
	| Asn1ExtensionAdditionGroup;

/** Descriptor items accepted in a `choice([...])` call. */
export type ChoiceComponentDescriptor =
	| Asn1Alternative<string, AnyAsn1TypeDef>
	| Asn1ExtensionMarker
	| Asn1ExtensionAdditionGroup;

/**
 * A rest-tuple shape (rather than a plain array type) so that TypeScript infers
 * a positional tuple from an array-literal argument without needing `as const`
 * at the call site.
 */
export type DescriptorTuple<T> = readonly [] | readonly [T, ...T[]];

/** Converts a public sequence/set descriptor tuple to its raw-def equivalent. */
export type SequenceComponentDescriptorsDef<
	C extends DescriptorTuple<SequenceComponentDescriptor>,
> = {
	readonly [K in keyof C]: C[K] extends Asn1Component<
		infer N,
		infer T,
		infer Opt
	>
		? Asn1ComponentDef<N, T, Opt>
		: C[K];
} extends infer R extends readonly Asn1SequenceComponentDescriptorDef[]
	? R
	: never;

/** Runtime counterpart of `SequenceComponentDescriptorsDef`. */
export function toSequenceComponentDescriptorsDef<
	C extends DescriptorTuple<SequenceComponentDescriptor>,
>(components: C): SequenceComponentDescriptorsDef<C> {
	return components.map((item) =>
		isComponent(item) ? componentRef(item) : item,
	) as unknown as SequenceComponentDescriptorsDef<C>;
}

/**
 * True if `item` is a component descriptor (as opposed to `COMPONENTS
 * OF`/`...`/extension group).
 */
function isComponent(
	item: SequenceComponentDescriptor,
): item is Asn1Component<string, AnyAsn1TypeDef, boolean> {
	return typeof item === "object" && item !== null && COMPONENT_DEF in item;
}

type _RequiredMembers<C extends readonly Asn1SequenceComponentDescriptorDef[]> =
	{
		readonly [
			K in Extract<
				C[number],
				Asn1ComponentDef<string, AnyAsn1TypeDef, false>
			> as K["name"] & string
		]: DefValueOf<K["type"]>;
	};

type _OptionalMembers<C extends readonly Asn1SequenceComponentDescriptorDef[]> =
	{
		readonly [
			K in Extract<
				C[number],
				Asn1ComponentDef<string, AnyAsn1TypeDef, true>
			> as K["name"] & string
		]?: DefValueOf<K["type"]>;
	};

/**
 * Infers the TypeScript object type produced by a tuple of SEQUENCE component
 * descriptors, respecting optionality.
 */
export type SequenceMembersOutput<
	C extends readonly Asn1SequenceComponentDescriptorDef[],
> = _RequiredMembers<C> & _OptionalMembers<C>;

/**
 * Infers the TypeScript union type produced by a tuple of CHOICE alternative
 * descriptors.
 */
export type ChoiceAlternativesOutput<
	A extends readonly Asn1ChoiceComponentDescriptorDef[],
> = A extends readonly (infer Item)[]
	? Item extends Asn1AlternativeDef<infer N extends string, infer T>
		? { readonly kind: N; readonly value: DefValueOf<T> }
		: never
	: never;
