import type {
	AnyAsn1TypeDef,
	AnyConstraintDef,
	Asn1AlternativeDef,
	Asn1AnyTypeDef,
	Asn1BitStringTypeDef,
	Asn1BooleanTypeDef,
	Asn1ChoiceTypeDef,
	Asn1ComponentDef,
	Asn1EnumeratedTypeDef,
	Asn1ExtensionAdditionGroupDef,
	Asn1ExtensionMarkerDef,
	Asn1IntegerTypeDef,
	Asn1LazyTypeDef,
	Asn1NullTypeDef,
	Asn1ObjectIdentifierTypeDef,
	Asn1OctetStringTypeDef,
	Asn1OidIriTypeDef,
	Asn1RealTypeDef,
	Asn1RelativeOidIriTypeDef,
	Asn1RelativeOidTypeDef,
	Asn1SequenceComponentDescriptorDef,
	Asn1SequenceOfTypeDef,
	Asn1SequenceTypeDef,
	Asn1SetOfTypeDef,
	Asn1SetTypeDef,
	Asn1TaggedTypeDef,
	NamedBit,
	NamedNumber,
	PermittedAlphabetConstraintDef,
	SizeConstraintDef,
	ValueRangeConstraintDef,
} from "@ac-kit/format-asn1";
import type {
	AnyAstConstraint,
	AnyAstType,
	AstBitStringType,
	AstChoiceType,
	AstComponent,
	AstConstrainedType,
	AstEnumeratedType,
	AstExtensionAdditionGroup,
	AstExtensionMarker,
	AstIntegerType,
	AstModule,
	AstPermittedAlphabetConstraint,
	AstSequenceOfType,
	AstSequenceType,
	AstSetOfType,
	AstSetType,
	AstStringBound,
	AstTaggedType,
	AstTypeReference,
} from "@ac-kit/format-asn1-notation";

import { CompileError } from "./errors.js";

export interface CompileResult {
	/** Outer key: module name; inner key: assignment name. */
	readonly defs: ReadonlyMap<string, ReadonlyMap<string, AnyAsn1TypeDef>>;
	readonly errors: readonly CompileError[];
}

interface CompilerContext {
	readonly moduleName: string;
	/** All defs being built — used for forward references via Asn1LazyTypeDef. */
	readonly defs: Map<string, AnyAsn1TypeDef>;
	readonly errors: CompileError[];
}

export function compileModules(modules: readonly AstModule[]): CompileResult {
	const result = new Map<string, ReadonlyMap<string, AnyAsn1TypeDef>>();
	const allErrors: CompileError[] = [];

	for (const module of modules) {
		const ctx: CompilerContext = {
			moduleName: module.name,
			defs: new Map(),
			errors: [],
		};

		// Pass 1: register all assignment names as lazy placeholders
		for (const assignment of module.assignments) {
			if (assignment.kind === "typeAssignment") {
				const placeholder: Asn1LazyTypeDef = {
					kind: "lazy",
					getter: (): AnyAsn1TypeDef =>
						ctx.defs.get(assignment.name) ?? { kind: "any" },
				};
				ctx.defs.set(assignment.name, placeholder);
			}
		}

		// Pass 2: lower each type assignment
		for (const assignment of module.assignments) {
			if (assignment.kind === "typeAssignment") {
				try {
					const def = lowerType(assignment.type, ctx);
					ctx.defs.set(assignment.name, def);
				} catch (e) {
					if (e instanceof CompileError) {
						ctx.errors.push(e);
					} else throw e;
				}
			}
		}

		result.set(module.name, new Map(ctx.defs));
		allErrors.push(...ctx.errors);
	}

	return { defs: result, errors: allErrors };
}

function lowerType(t: AnyAstType, ctx: CompilerContext): AnyAsn1TypeDef {
	switch (t.kind) {
		case "boolean":
			return { kind: "boolean" } satisfies Asn1BooleanTypeDef;
		case "null":
			return { kind: "null" } satisfies Asn1NullTypeDef;
		case "octetString":
			return { kind: "octetString" } satisfies Asn1OctetStringTypeDef;
		case "objectIdentifier":
			return { kind: "objectIdentifier" } satisfies Asn1ObjectIdentifierTypeDef;
		case "relativeOid":
			return { kind: "relativeOid" } satisfies Asn1RelativeOidTypeDef;
		case "oidIri":
			return { kind: "oidIri" } satisfies Asn1OidIriTypeDef;
		case "relativeOidIri":
			return { kind: "relativeOidIri" } satisfies Asn1RelativeOidIriTypeDef;
		case "real":
			return { kind: "real" } satisfies Asn1RealTypeDef;
		case "any":
			return { kind: "any" } satisfies Asn1AnyTypeDef;
		case "external":
			return { kind: "external" };
		case "embeddedPdv":
			return { kind: "embeddedPdv" };
		case "characterString":
			return { kind: "characterString" };
		case "objectDescriptor":
			return { kind: "utf8String" }; // mapped to UTF8 for compatibility

		case "integer":
			return lowerIntegerType(t);
		case "bitString":
			return lowerBitStringType(t);
		case "enumerated":
			return lowerEnumeratedType(t);

		case "utf8String":
			return { kind: "utf8String" };
		case "numericString":
			return { kind: "numericString" };
		case "printableString":
			return { kind: "printableString" };
		case "teletexString":
			return { kind: "teletexString" };
		case "videotexString":
			return { kind: "videotexString" };
		case "ia5String":
			return { kind: "ia5String" };
		case "graphicString":
			return { kind: "graphicString" };
		case "visibleString":
			return { kind: "visibleString" };
		case "generalString":
			return { kind: "generalString" };
		case "universalString":
			return { kind: "universalString" };
		case "bmpString":
			return { kind: "bmpString" };

		case "utcTime":
			return { kind: "utcTime" };
		case "generalizedTime":
			return { kind: "generalizedTime" };
		case "time":
			return { kind: "time" };
		case "date":
			return { kind: "date" };
		case "timeOfDay":
			return { kind: "timeOfDay" };
		case "dateTime":
			return { kind: "dateTime" };
		case "duration":
			return { kind: "duration" };

		case "sequence":
			return lowerSequenceType(t, ctx);
		case "set":
			return lowerSetType(t, ctx);
		case "sequenceOf":
			return lowerSequenceOfType(t, ctx);
		case "setOf":
			return lowerSetOfType(t, ctx);
		case "choice":
			return lowerChoiceType(t, ctx);
		case "tagged":
			return lowerTaggedType(t, ctx);
		case "constrained":
			return lowerConstrainedType(t, ctx);
		case "typeReference":
			return lowerTypeReference(t, ctx);
	}
}

function lowerIntegerType(t: AstIntegerType): Asn1IntegerTypeDef {
	const namedNumbers: NamedNumber[] = t.namedNumbers.map((n) => ({
		name: n.name,
		value: n.value,
	}));
	return { kind: "integer", ...(namedNumbers.length ? { namedNumbers } : {}) };
}

function lowerBitStringType(t: AstBitStringType): Asn1BitStringTypeDef {
	const namedBits: NamedBit[] = t.namedBits.map((b) => ({
		name: b.name,
		index: b.index,
	}));
	return { kind: "bitString", ...(namedBits.length ? { namedBits } : {}) };
}

function lowerEnumeratedType(t: AstEnumeratedType): Asn1EnumeratedTypeDef {
	const namedNumbers: NamedNumber[] = t.values.map((v) => ({
		name: v.name,
		value: v.value,
	}));
	return { kind: "enumerated", namedNumbers };
}

function lowerSequenceType(
	t: AstSequenceType,
	ctx: CompilerContext,
): Asn1SequenceTypeDef {
	const components = t.components.map((c) => lowerSeqComponent(c, ctx));
	return { kind: "sequence", components };
}

function lowerSetType(t: AstSetType, ctx: CompilerContext): Asn1SetTypeDef {
	const components = t.components.map((c) => lowerSeqComponent(c, ctx));
	return { kind: "set", components };
}

function lowerSeqComponent(
	c: AstComponent | AstExtensionMarker | AstExtensionAdditionGroup,
	ctx: CompilerContext,
): Asn1SequenceComponentDescriptorDef {
	if (c.kind === "extensionMarker")
		return { kind: "extensionMarker" } satisfies Asn1ExtensionMarkerDef;
	if (c.kind === "extensionAdditionGroup") {
		return {
			kind: "extensionAdditionGroup",
			...(c.version != null ? { version: c.version } : {}),
			components: c.components.map((comp) => lowerComponent(comp, ctx)),
		} satisfies Asn1ExtensionAdditionGroupDef;
	}
	return lowerComponent(c, ctx);
}

function lowerComponent(
	c: AstComponent,
	ctx: CompilerContext,
): Asn1ComponentDef {
	return {
		kind: "component",
		name: c.name,
		type: lowerType(c.type, ctx),
		optional: c.optional,
	};
}

function lowerSequenceOfType(
	t: AstSequenceOfType,
	ctx: CompilerContext,
): Asn1SequenceOfTypeDef {
	const elementType = lowerType(t.elementType, ctx);
	const constraints = t.constraint
		? [lowerConstraint(t.constraint)]
		: undefined;
	return {
		kind: "sequenceOf",
		elementType,
		...(constraints ? { constraints } : {}),
	};
}

function lowerSetOfType(
	t: AstSetOfType,
	ctx: CompilerContext,
): Asn1SetOfTypeDef {
	const elementType = lowerType(t.elementType, ctx);
	const constraints = t.constraint
		? [lowerConstraint(t.constraint)]
		: undefined;
	return {
		kind: "setOf",
		elementType,
		...(constraints ? { constraints } : {}),
	};
}

function lowerChoiceType(
	t: AstChoiceType,
	ctx: CompilerContext,
): Asn1ChoiceTypeDef {
	const alternatives = t.alternatives.map((a) => {
		if (a.kind === "extensionMarker")
			return { kind: "extensionMarker" } satisfies Asn1ExtensionMarkerDef;
		if (a.kind === "extensionAdditionGroup") {
			return {
				kind: "extensionAdditionGroup",
				...(a.version != null ? { version: a.version } : {}),
				components: a.components.map((c) => lowerComponent(c, ctx)),
			} satisfies Asn1ExtensionAdditionGroupDef;
		}
		return {
			name: a.name,
			type: lowerType(a.type, ctx),
		} satisfies Asn1AlternativeDef;
	});
	return { kind: "choice", alternatives };
}

function lowerTaggedType(
	t: AstTaggedType,
	ctx: CompilerContext,
): Asn1TaggedTypeDef {
	const innerType = lowerType(t.innerType, ctx);
	const tagClass =
		t.tagClass === "context"
			? ("context" as const)
			: t.tagClass === "application"
				? ("application" as const)
				: t.tagClass === "private"
					? ("private" as const)
					: ("universal" as const);
	const mode = (t.mode ?? "explicit") as "implicit" | "explicit";
	return {
		kind: "tagged",
		tag: { tagClass, tagNumber: t.tagNumber },
		mode,
		innerType,
	};
}

function lowerConstrainedType(
	t: AstConstrainedType,
	ctx: CompilerContext,
): AnyAsn1TypeDef {
	const base = lowerType(t.baseType, ctx) as AnyAsn1TypeDef & {
		constraints?: readonly AnyConstraintDef[];
	};
	const constraint = lowerConstraint(t.constraint);
	return {
		...base,
		constraints: [...(base.constraints ?? []), constraint],
	} as AnyAsn1TypeDef;
}

function lowerTypeReference(
	t: AstTypeReference,
	ctx: CompilerContext,
): AnyAsn1TypeDef {
	// Known built-in type names that appear as unresolved TypeReferences
	const builtins: Record<string, AnyAsn1TypeDef> = {
		ANY: { kind: "any" },
		INTEGER: { kind: "integer" },
		BOOLEAN: { kind: "boolean" },
		NULL: { kind: "null" },
	};
	if (builtins[t.name]) return builtins[t.name] as AnyAsn1TypeDef;

	// Resolve via lazy reference so forward/circular references work
	const lazy: Asn1LazyTypeDef = {
		kind: "lazy",
		getter: (): AnyAsn1TypeDef => ctx.defs.get(t.name) ?? { kind: "any" },
	};
	return lazy;
}

function lowerConstraint(c: AnyAstConstraint): AnyConstraintDef {
	switch (c.kind) {
		case "valueRange":
			return {
				kind: "valueRange",
				min: numericBound(c.min, "MIN"),
				max: numericBound(c.max, "MAX"),
			} satisfies ValueRangeConstraintDef;
		case "size":
			return {
				kind: "size",
				min: extractSizeBound(c.constraint, "min"),
				max: extractSizeBound(c.constraint, "max"),
			} satisfies SizeConstraintDef;
		case "permittedAlphabet":
			return {
				kind: "permittedAlphabet",
				alphabet: extractAlphabet(c),
			} satisfies PermittedAlphabetConstraintDef;
		case "union":
			return {
				kind: "union",
				operands: c.operands.map(lowerConstraint),
			};
		case "intersection":
			return {
				kind: "intersection",
				operands: c.operands.map(lowerConstraint),
			};
		case "extensible":
			return {
				kind: "extensibleConstraint",
				constraint: lowerConstraint(c.base),
			};
		case "contentsConstraint":
			return { kind: "userDefinedConstraint", description: "CONTAINING" };
		case "withComponents":
			return { kind: "userDefinedConstraint", description: "WITH COMPONENTS" };
	}
}

/**
 * A runtime value range compares numbers, so a character-string bound (which
 * only `FROM` gives meaning to) degrades to the open end rather than being
 * coerced into a number it never was.
 */
function numericBound<TOpen extends "MIN" | "MAX">(
	bound: bigint | AstStringBound | "MIN" | "MAX",
	open: TOpen,
): bigint | TOpen {
	return typeof bound === "bigint" ? bound : open;
}

function extractSizeBound(
	c: AnyAstConstraint,
	bound: "min" | "max",
): bigint | "MIN" | "MAX" {
	if (c.kind === "valueRange") {
		return bound === "min"
			? numericBound(c.min, "MIN")
			: numericBound(c.max, "MAX");
	}
	return bound === "min" ? 0n : "MAX";
}

/**
 * The characters a `FROM` constraint admits, expanded from whatever notation
 * named them.
 *
 * The runtime tests membership with `alphabet.includes(ch)`, so a range has to
 * become every character in it: `FROM ("a".."z")` is the 26 letters, not the
 * three characters of the string `"a-z"`.
 */
function extractAlphabet(c: AstPermittedAlphabetConstraint): string {
	return collectAlphabet(c.constraint);
}

function collectAlphabet(c: AnyAstConstraint): string {
	if (c.kind === "union" || c.kind === "intersection") {
		return c.operands.map(collectAlphabet).join("");
	}
	if (c.kind !== "valueRange") {
		return "";
	}

	const min = boundText(c.min);
	const max = boundText(c.max);
	if (min === undefined || max === undefined) {
		return "";
	}

	// A single value constraint lowers to `value..value`, and names the whole
	// string rather than a one-character range.
	if (min === max) {
		return min;
	}
	if (min.length !== 1 || max.length !== 1) {
		return "";
	}

	const first = min.codePointAt(0);
	const last = max.codePointAt(0);
	if (first === undefined || last === undefined || first > last) {
		return "";
	}

	let alphabet = "";
	for (let code = first; code <= last; code++) {
		alphabet += String.fromCodePoint(code);
	}
	return alphabet;
}

function boundText(
	bound: bigint | AstStringBound | "MIN" | "MAX",
): string | undefined {
	if (bound === "MIN" || bound === "MAX") {
		return undefined;
	}
	return typeof bound === "bigint" ? bound.toString() : bound.text;
}
