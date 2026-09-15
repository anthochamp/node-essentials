import {
	constraintFromRef,
	constraintRef,
	type AnyConstraint,
	type AnyConstraintDef,
	type WithComponentsEntry,
} from "../constraints/common.js";
import { exceptConstraint } from "../constraints/except.js";
import { extensibleConstraint } from "../constraints/extensible.js";
import { intersectionConstraint } from "../constraints/intersection.js";
import { unionConstraint } from "../constraints/union.js";
import { withComponentsConstraint } from "../constraints/with-components.js";
import type { Asn1TypeDefBase, DefInputOf, DefValueOf } from "../def.js";
import type { Tag, TagClass, TaggingMode } from "../metadata.js";
import { AnyAsn1TypeDef } from "./any-def.js";

/**
 * Extracts the decoded output type of a schema or a raw def — `D`'s own
 * `__output` phantom field is hidden behind the schema's symbol, so this
 * unwraps `Asn1Type<D>` to `D` first when given a schema.
 */
export type ValueOf<T> =
	T extends Asn1Type<infer D> ? DefValueOf<D> : DefValueOf<T>;

/** Extracts the encoded input type of a schema or a raw def. See `ValueOf`. */
export type InputOf<T> =
	T extends Asn1Type<infer D> ? DefInputOf<D> : DefInputOf<T>;

// ── Constraint algebra (pure def transformations) ──────────────────────────
// Internal engine behind the chainable constraint methods below.

/** Constraints currently attached to `def`, if any. */
function constraints_(def: AnyAsn1TypeDef): readonly AnyConstraintDef[] {
	return (
		(def as { constraints?: readonly AnyConstraintDef[] }).constraints ?? []
	);
}

/** `def` with `c` appended to its constraint list, unwrapped. */
function appendConstraintDef<D extends AnyAsn1TypeDef>(
	def: D,
	c: AnyConstraintDef,
): D {
	return {
		...def,
		constraints: [...constraints_(def), c],
	};
}

/** `def` with its constraints replaced by `EXCEPT c`. */
function exceptConstraintDef<D extends AnyAsn1TypeDef>(
	def: D,
	c: AnyConstraint,
): D {
	const currentConstraints = constraints_(def);
	const base: AnyConstraintDef =
		currentConstraints.length === 1
			? currentConstraints[0]!
			: { kind: "intersection", operands: currentConstraints };
	return {
		...def,
		constraints: [constraintRef(exceptConstraint(constraintFromRef(base), c))],
	};
}

/** `def` with its last constraint wrapped as extensible (`constraint, ...`). */
function extensibleConstraintDef<D extends AnyAsn1TypeDef>(def: D): D {
	const currentConstraints = constraints_(def);
	if (currentConstraints.length === 0) {
		return def;
	}
	const last = currentConstraints[currentConstraints.length - 1]!;
	const rest = currentConstraints.slice(0, -1);
	return {
		...def,
		constraints: [
			...rest,
			constraintRef(extensibleConstraint(constraintFromRef(last))),
		],
	};
}

// ── Schema encapsulation ─────────────────────────────────────────────────────
// The def tree lives behind a module-private symbol: external code has no way
// to name the key, so schema data is only reachable through the chainable
// methods, or through `ref()`/`fromRef()` at codec/tooling boundaries.

const SCHEMA_DEF = Symbol("asn1SchemaDef");

/** Any ASN.1 schema value: a hidden def tree plus its chainable methods. */
export type Asn1Type<D extends AnyAsn1TypeDef = AnyAsn1TypeDef> = Readonly<
	Record<typeof SCHEMA_DEF, D>
> &
	SchemaMethods<D>;

/** Extract the raw def tree from a schema — the shape codecs operate on. */
export function ref<D extends AnyAsn1TypeDef>(schema: Asn1Type<D>): D {
	return schema[SCHEMA_DEF];
}

/**
 * True if `value` is a schema produced by this module (as opposed to a plain
 * value).
 */
export function isAsn1Type(value: unknown): value is Asn1Type<AnyAsn1TypeDef> {
	return typeof value === "object" && value !== null && SCHEMA_DEF in value;
}

/**
 * Attach the hidden def and the shared chainable methods to `def`. `rewrap`
 * reconstructs a schema of the same shape from a replacement def — each factory
 * passes itself, so `range()`/`namedNumbers()`/etc. chain back into the same
 * concrete type. Type-specific factories spread this result and add their own
 * extra methods on top.
 */
export function wrapSchema<D extends AnyAsn1TypeDef>(
	def: D,
	rewrap: (newDef: D) => Asn1Type<D>,
): Asn1Type<D> {
	return {
		[SCHEMA_DEF]: def,
		...attachSchemaMethods(def, rewrap),
	} as Asn1Type<D>;
}

/** The chainable methods shared by every schema value, regardless of def kind. */
export interface SchemaMethods<D extends AnyAsn1TypeDef> {
	/** Append a union constraint to this schema's constraint list. */
	constraintUnion(c: AnyConstraint): Asn1Type<D>;
	/** Append an intersection constraint to this schema's constraint list. */
	constraintIntersect(c: AnyConstraint): Asn1Type<D>;
	/** Append an except constraint subtracting `c` from this schema. */
	constraintExcept(c: AnyConstraint): Asn1Type<D>;
	/** Wrap the last constraint as extensible (`constraint, ...`). */
	extensibleConstraint(): Asn1Type<D>;
	/** Append a `WITH COMPONENTS` constraint. */
	withComponents(
		map: Readonly<Record<string, WithComponentsEntry>>,
	): Asn1Type<D>;
	/** Wrap with a context-class explicit tag `[n]`. */
	contextTag(n: number): Asn1TaggedType<D>;
	/** Wrap with a context-class implicit tag `[n] IMPLICIT`. */
	contextImplicitTag(n: number): Asn1TaggedType<D>;
	/** Wrap with an application-class tag `[APPLICATION n]`. */
	applicationTag(n: number, mode?: TaggingMode): Asn1TaggedType<D>;
	/** Wrap with a private-class tag `[PRIVATE n]`. */
	privateTag(n: number, mode?: TaggingMode): Asn1TaggedType<D>;
	/** Wrap with a tag of arbitrary class/number/mode. */
	tag(tagClass: TagClass, n: number, mode: TaggingMode): Asn1TaggedType<D>;
	/** Return a new schema that applies `fn` to each decoded value. */
	transform<T>(fn: (v: ValueOf<D>) => T): Asn1TransformType<T, InputOf<D>>;
}

/** Build a tagged def wrapping `inner` (already a raw def). */
function taggedDef<Inner extends AnyAsn1TypeDef>(
	tagClass: TagClass,
	n: number,
	mode: TaggingMode,
	inner: Inner,
): Asn1TaggedTypeDef<Inner> {
	return {
		kind: "tagged",
		tag: { tagClass, tagNumber: n },
		mode,
		innerType: inner,
	};
}

function attachSchemaMethods<D extends AnyAsn1TypeDef>(
	def: D,
	rewrap: (newDef: D) => Asn1Type<D>,
): SchemaMethods<D> {
	return {
		constraintUnion: (c) =>
			rewrap(appendConstraintDef(def, constraintRef(unionConstraint(c)))),
		constraintIntersect: (c) =>
			rewrap(
				appendConstraintDef(def, constraintRef(intersectionConstraint(c))),
			),
		constraintExcept: (c) => rewrap(exceptConstraintDef(def, c)),
		extensibleConstraint: () => rewrap(extensibleConstraintDef(def)),
		withComponents: (map) =>
			rewrap(
				appendConstraintDef(def, constraintRef(withComponentsConstraint(map))),
			),
		contextTag: (n) => taggedType(taggedDef("context", n, "explicit", def)),
		contextImplicitTag: (n) =>
			taggedType(taggedDef("context", n, "implicit", def)),
		applicationTag: (n, mode = "explicit") =>
			taggedType(taggedDef("application", n, mode, def)),
		privateTag: (n, mode = "explicit") =>
			taggedType(taggedDef("private", n, mode, def)),
		tag: (tagClass, n, mode) => taggedType(taggedDef(tagClass, n, mode, def)),
		transform: (fn) =>
			transformType({
				kind: "transform",
				innerType: def,
				fn: fn as (v: unknown) => unknown,
			}) as any,
	};
}

// ── Tagged schema ───────────────────────────────────────────────────────────
// Defined in base.ts to avoid circular ESM import issues (tagged() constructs
// an Asn1Type, and Asn1Type's contextTag()/tag() methods construct tagged()).

/** Tagging wrapper descriptor. Transparent to `ValueOf`/`InputOf`. */
export type Asn1TaggedTypeDef<Inner extends AnyAsn1TypeDef = any> = {
	readonly kind: "tagged";
	readonly tag: Tag;
	readonly mode: TaggingMode;
	readonly innerType: Inner;
	readonly __output?: DefValueOf<Inner>;
	readonly __input?: DefInputOf<Inner>;
};

export type Asn1TaggedType<Inner extends AnyAsn1TypeDef> = Asn1Type<
	Asn1TaggedTypeDef<Inner>
>;

export function taggedType<Inner extends AnyAsn1TypeDef>(
	def: Asn1TaggedTypeDef<Inner>,
): Asn1TaggedType<Inner> {
	return wrapSchema(def, taggedType);
}

/** Wrap `inner` with a context-class explicit tag `[n]`. */
export function contextTag<T extends AnyAsn1TypeDef>(
	n: number,
	inner: Asn1Type<T>,
): Asn1TaggedType<T> {
	return taggedType(taggedDef("context", n, "explicit", ref(inner)));
}
/** Wrap `inner` with a context-class implicit tag `[n] IMPLICIT`. */
export function contextImplicitTag<T extends AnyAsn1TypeDef>(
	n: number,
	inner: Asn1Type<T>,
): Asn1TaggedType<T> {
	return taggedType(taggedDef("context", n, "implicit", ref(inner)));
}
/** Wrap `inner` with an application-class tag `[APPLICATION n]`. */
export function applicationTag<T extends AnyAsn1TypeDef>(
	n: number,
	mode: TaggingMode,
	inner: Asn1Type<T>,
): Asn1TaggedType<T> {
	return taggedType(taggedDef("application", n, mode, ref(inner)));
}
/** Wrap `inner` with a private-class tag `[PRIVATE n]`. */
export function privateTag<T extends AnyAsn1TypeDef>(
	n: number,
	mode: TaggingMode,
	inner: Asn1Type<T>,
): Asn1TaggedType<T> {
	return taggedType(taggedDef("private", n, mode, ref(inner)));
}
/** Wrap `inner` with a tag of arbitrary class/number/mode. */
export function tag<T extends AnyAsn1TypeDef>(
	tagClass: TagClass,
	n: number,
	mode: TaggingMode,
	inner: Asn1Type<T>,
): Asn1TaggedType<T> {
	return taggedType(taggedDef(tagClass, n, mode, ref(inner)));
}
/** Read back the inner schema wrapped by a tagged schema. */
export function untag<Inner extends AnyAsn1TypeDef>(
	schema: Asn1TaggedType<Inner>,
): AnyAsn1TypeDef {
	return ref<Asn1TaggedTypeDef<Inner>>(schema).innerType;
}

// ── Transform schema ────────────────────────────────────────────────────────
// Defined here alongside Asn1TaggedType for the same circular-import reasons.

/**
 * Transform wrapper descriptor.
 *
 * `fn` is never producible from ASN.1 notation (no compiler ever constructs
 * one) and is never serialized to bytes or JSON — it exists purely so
 * encode/decode, which only ever see a `def` tree, can actually run it.
 */
export type Asn1TransformTypeDef<
	NewOutput = unknown,
	OriginalInput = unknown,
> = Asn1TypeDefBase<"transform", NewOutput, OriginalInput> & {
	readonly innerType: AnyAsn1TypeDef;
	readonly fn?: (v: unknown) => unknown;
};

export type Asn1TransformType<NewOutput, OriginalInput> = Asn1Type<
	Asn1TransformTypeDef<NewOutput, OriginalInput>
>;

export function transformType<NewOutput, OriginalInput>(
	def: Asn1TransformTypeDef<NewOutput, OriginalInput>,
): Asn1TransformType<NewOutput, OriginalInput> {
	return wrapSchema(def, transformType);
}

/** Return a schema that applies `fn` to each value decoded via `inner`. */
export function transform<NewOutput, OriginalInput = unknown>(
	fn: (v: OriginalInput) => NewOutput,
	inner: Asn1Type<AnyAsn1TypeDef>,
): Asn1TransformType<NewOutput, OriginalInput> {
	return transformType({
		kind: "transform",
		innerType: ref(inner),
		fn: fn as (v: unknown) => unknown,
	});
}
