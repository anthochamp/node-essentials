import { Asn1TypeDefBase } from "../../def.js";
import { AnyAsn1TypeDef } from "../any-def.js";
import { isAsn1Type, ref, wrapSchema, type Asn1Type } from "../base.js";
import type { Asn1ComponentDef } from "../constructed/component.js";

// ── Param declarations ────────────────────────────────────────────────────────

/** X.683 type parameter declaration. */
export type Asn1TypeParamDef = {
	readonly paramKind: "type";
	readonly name: string;
};

/** X.683 value parameter declaration. */
export type Asn1ValueParamDef = {
	readonly paramKind: "value";
	readonly name: string;
	readonly governor: AnyAsn1TypeDef;
};

/** Parameter declaration union for X.683 templates. */
export type Asn1ParamDef = Asn1TypeParamDef | Asn1ValueParamDef;

// ── ParamRef ──────────────────────────────────────────────────────────────────

/** X.683 type-parameter reference descriptor (template body only). */
export type Asn1ParamRefTypeDef = Asn1TypeDefBase<"paramRef", unknown> & {
	readonly name: string;
};

/** Placeholder schema for a type parameter inside a parameterized type body. */
export type Asn1ParamRefType = Asn1Type<Asn1ParamRefTypeDef>;

export function paramRefSchema(def: Asn1ParamRefTypeDef): Asn1ParamRefType {
	return wrapSchema(def, paramRefSchema);
}

/** X.683 value-parameter reference descriptor (template body only). */
export type Asn1ParamValueRefTypeDef = Asn1TypeDefBase<
	"paramValueRef",
	unknown
> & {
	readonly name: string;
};

/** Placeholder schema for a value parameter inside a parameterized type body. */
export type Asn1ParamValueRefType = Asn1Type<Asn1ParamValueRefTypeDef>;

export function paramValueRefSchema(
	def: Asn1ParamValueRefTypeDef,
): Asn1ParamValueRefType {
	return wrapSchema(def, paramValueRefSchema);
}

/** Factory: type parameter reference (used inside parameterized type bodies). */
export function paramRef(name: string): Asn1ParamRefType {
	return paramRefSchema({ kind: "paramRef", name });
}

/** Factory: value parameter reference (used inside parameterized type bodies). */
export function paramValueRef(name: string): Asn1ParamValueRefType {
	return paramValueRefSchema({ kind: "paramValueRef", name });
}

// ── ParameterizedTypeInstance ─────────────────────────────────────────────────

/** X.683 parameterized type instantiation descriptor. */
export type Asn1ParameterizedTypeInstanceDef = Asn1TypeDefBase<
	"parameterizedTypeInstance",
	unknown
> & {
	readonly template: Asn1ParameterizedTypeDef;
	readonly args: Readonly<Record<string, /*AnyAsn1TypeDef | */ unknown>>;
};

/** Schema produced by instantiating a `Asn1ParameterizedType`. */
export type Asn1ParameterizedTypeInstance =
	Asn1Type<Asn1ParameterizedTypeInstanceDef>;

export function parameterizedTypeInstanceSchema(
	def: Asn1ParameterizedTypeInstanceDef,
): Asn1ParameterizedTypeInstance {
	return wrapSchema(def, parameterizedTypeInstanceSchema);
}

// ── ParameterizedType ─────────────────────────────────────────────────────────

/** X.683 parameterized type template descriptor (not part of `AnyAsn1TypeDef`). */
export type Asn1ParameterizedTypeDef = {
	readonly name: string;
	readonly params: readonly Asn1ParamDef[];
	readonly body: AnyAsn1TypeDef;
};

/**
 * Template container for a parameterized ASN.1 type (X.683).
 *
 * NOT an `Asn1Type` — it is a template, not a schema. Use `.instantiate()` to
 * produce a concrete `Asn1ParameterizedTypeInstance`.
 */
export type Asn1ParameterizedType<_Params extends readonly Asn1ParamDef[]> = {
	readonly templateDef: Asn1ParameterizedTypeDef;
	/**
	 * Instantiate this template with concrete type and/or value arguments. Args
	 * are keyed by parameter name; type arguments are schemas, value arguments
	 * are plain values.
	 */
	instantiate(
		args: Readonly<Record<string, unknown>>,
	): Asn1ParameterizedTypeInstance;
};

/** Factory: create a parameterized type template. */
export function parameterizedType<Params extends readonly Asn1ParamDef[]>(
	name: string,
	params: Params,
	body: Asn1Type<AnyAsn1TypeDef>,
): Asn1ParameterizedType<Params> {
	const templateDef: Asn1ParameterizedTypeDef = {
		name,
		params,
		body: ref(body),
	};
	return {
		templateDef,
		instantiate(args) {
			const resolvedArgs: Record<string, /*AnyAsn1TypeDef | */ unknown> = {};
			for (const [key, value] of Object.entries(args)) {
				resolvedArgs[key] = isAsn1Type(value) ? ref(value) : value;
			}
			return parameterizedTypeInstanceSchema({
				kind: "parameterizedTypeInstance",
				template: templateDef,
				args: resolvedArgs,
			});
		},
	};
}

// ── Param declarations ────────────────────────────────────────────────────────

/** Declare a type parameter for a parameterized type template. */
export function typeParam(name: string): Asn1TypeParamDef {
	return { paramKind: "type", name };
}

/** Declare a value parameter for a parameterized type template. */
export function valueParam(
	name: string,
	governor: Asn1Type<AnyAsn1TypeDef>,
): Asn1ValueParamDef {
	return { paramKind: "value", name, governor: ref(governor) };
}

// ── Substitution ─────────────────────────────────────────────────────────────

/**
 * Resolve a `Asn1ParameterizedTypeInstanceDef` to a flat concrete
 * `AnyAsn1TypeDef` by substituting all `Asn1ParamRefTypeDef` and
 * `Asn1ParamValueRefTypeDef` nodes.
 */
export function resolveInstance(
	instanceDef: Asn1ParameterizedTypeInstanceDef,
): AnyAsn1TypeDef {
	return substituteParams(instanceDef.template.body, instanceDef.args);
}

function substituteParams(
	def: AnyAsn1TypeDef,
	args: Readonly<Record<string, /*AnyAsn1TypeDef | */ unknown>>,
): AnyAsn1TypeDef {
	if (def.kind === "paramRef") {
		const arg = args[def.name];
		return arg !== undefined ? (arg as AnyAsn1TypeDef) : def;
	}
	if (def.kind === "paramValueRef") {
		// Value params are substituted at the constraint level, not the type level.
		// For size / range constraints, the caller handles this.
		return def;
	}
	if (def.kind === "parameterizedTypeInstance") {
		// Recursively resolve nested instances.
		const inner = resolveInstance(def);
		return substituteParams(inner, args);
	}
	if ("components" in def) {
		const components = def.components.map((c) => {
			if (c.kind === "component") {
				return { ...c, type: substituteParams(c.type, args) };
			}
			if (c.kind === "extensionAdditionGroup") {
				return {
					...c,
					components: c.components.map((cc: Asn1ComponentDef) => ({
						...cc,
						type: substituteParams(cc.type, args),
					})),
				};
			}
			return c;
		});
		return { ...def, components };
	}
	if ("elementType" in def) {
		return { ...def, elementType: substituteParams(def.elementType, args) };
	}
	if ("alternatives" in def) {
		const alternatives = def.alternatives.map((a) => {
			if (
				"kind" in a &&
				(a.kind === "extensionMarker" || a.kind === "extensionAdditionGroup")
			) {
				return a;
			}
			return { ...a, type: substituteParams(a.type, args) };
		});
		return { ...def, alternatives };
	}
	return def;
}
