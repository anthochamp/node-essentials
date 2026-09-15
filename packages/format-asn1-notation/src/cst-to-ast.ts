import type {
	AnyAstAssignment,
	AstTypeAssignment,
	AstValueAssignment,
} from "./ast/assignment.js";
import type {
	AstAlternative,
	AstComponent,
	AstExtensionAdditionGroup,
	AstExtensionMarker,
} from "./ast/component.js";
import type { AnyAstConstraint, AstStringBound } from "./ast/constraint.js";
import type { AstExport, AstImport, AstModule } from "./ast/module.js";
import type {
	AnyAstType,
	AstBitStringType,
	AstChoiceType,
	AstEnumeratedType,
	AstIntegerType,
	AstNamedBit,
	AstNamedNumber,
	AstSequenceOfType,
	AstSequenceType,
	AstSetOfType,
	AstSetType,
	AstStringType,
	AstTaggedType,
	AstTimeType,
	AstTypeReference,
} from "./ast/type.js";
import type { AnyAstValue } from "./ast/value.js";
import type {
	CstAnyAssignment,
	CstTypeAssignment,
	CstValueAssignment,
} from "./cst/assignment.js";
import type { CstConstraintSpec } from "./cst/constraint.js";
import type {
	CstAlternativeType,
	CstChoiceType,
	CstComponentType,
	CstSequenceOfType,
	CstSequenceOrSetComponent,
	CstSequenceType,
	CstSetOfType,
	CstSetType,
} from "./cst/constructed.js";
import type {
	CstModuleDefinition,
	CstOidComponent,
	CstOidValue,
	CstSymbolsFromModule,
} from "./cst/module.js";
import type {
	CstActualParam,
	CstAnyType,
	CstBuiltinPrimitiveType,
	CstReferencedType,
	CstTaggedType,
} from "./cst/type.js";
import type { CstAnyValue } from "./cst/value.js";
import { Token, TokenKind } from "./token.js";

/** Lower a CST module to an AST module. */
export function cstToAst(cst: CstModuleDefinition): AstModule {
	const tagDefault = resolveTagDefault(cst.tagDefault?.mode);
	return {
		kind: "module",
		span: cst.span,
		name: cst.moduleIdentifier.name.text,
		oid: cst.moduleIdentifier.oid
			? lowerOid(cst.moduleIdentifier.oid)
			: undefined,
		tagDefault,
		extensibilityImplied: cst.extensibilityImplied,
		exports: lowerExports(cst),
		imports: (cst.body.imports?.symbolsFromModules ?? []).map(lowerImport),
		assignments: cst.body.assignments.map(lowerAssignment),
	};
}

function resolveTagDefault(
	mode: string | undefined,
): "explicit" | "implicit" | "automatic" | "none" {
	if (mode === "implicit") return "implicit";
	if (mode === "automatic") return "automatic";
	if (mode === "explicit") return "explicit";
	return "none";
}

function lowerExports(cst: CstModuleDefinition): AstExport {
	const exp = cst.body.exports;
	if (!exp) return "all";
	if (!exp.symbols) return "all";
	return exp.symbols.map((t) => t.text);
}

function lowerImport(cst: CstSymbolsFromModule): AstImport {
	return {
		kind: "import",
		span: cst.span,
		symbols: cst.symbols.map((t) => t.text),
		fromModule: cst.module.text,
		oid: cst.oid ? lowerOid(cst.oid) : undefined,
	};
}

function lowerOid(cst: CstOidValue): readonly number[] {
	return cst.components.map(lowerOidComponent);
}

function lowerOidComponent(c: CstOidComponent): number {
	if (c.kind === "oidNumber") return parseInt(c.token.text, 10);
	if (c.kind === "oidNameAndNumber") return parseInt(c.number.text, 10);
	// named-only component — we can't resolve without a registry here
	return 0;
}

function lowerAssignment(cst: CstAnyAssignment): AnyAstAssignment {
	if (cst.kind === "typeAssignment") return lowerTypeAssignment(cst);
	return lowerValueAssignment(cst);
}

function lowerTypeAssignment(cst: CstTypeAssignment): AstTypeAssignment {
	return {
		kind: "typeAssignment",
		span: cst.span,
		name: cst.name.text,
		params: cst.params?.params.map((p) => ({
			name: p.name.text,
			governor: p.governor ? lowerType(p.governor) : undefined,
		})),
		type: lowerType(cst.type),
	};
}

function lowerValueAssignment(cst: CstValueAssignment): AstValueAssignment {
	return {
		kind: "valueAssignment",
		span: cst.span,
		name: cst.name.text,
		type: lowerType(cst.type),
		value: lowerValue(cst.value),
	};
}

export function lowerType(cst: CstAnyType): AnyAstType {
	switch (cst.kind) {
		case "boolean":
			return { kind: "boolean", span: cst.span };
		case "null":
			return { kind: "null", span: cst.span };
		case "octetString":
			return { kind: "octetString", span: cst.span };
		case "objectIdentifier":
			return { kind: "objectIdentifier", span: cst.span };
		case "relativeOid":
			return { kind: "relativeOid", span: cst.span };
		case "oidIri":
			return { kind: "oidIri", span: cst.span };
		case "relativeOidIri":
			return { kind: "relativeOidIri", span: cst.span };
		case "real":
			return { kind: "real", span: cst.span };
		case "any":
			return { kind: "any", span: cst.span };
		case "external":
			return { kind: "external", span: cst.span };
		case "embeddedPdv":
			return { kind: "embeddedPdv", span: cst.span };
		case "characterString":
			return { kind: "characterString", span: cst.span };
		case "objectDescriptor":
			return { kind: "objectDescriptor", span: cst.span };

		case "integer":
			return lowerIntegerType(cst);
		case "bitString":
			return lowerBitStringType(cst);
		case "enumerated":
			return lowerEnumeratedType(cst);

		case "utf8String":
		case "numericString":
		case "printableString":
		case "teletexString":
		case "videotexString":
		case "ia5String":
		case "graphicString":
		case "visibleString":
		case "generalString":
		case "universalString":
		case "bmpString":
			return { kind: cst.kind as AstStringType["kind"], span: cst.span };

		case "utcTime":
		case "generalizedTime":
		case "time":
		case "date":
		case "timeOfDay":
		case "dateTime":
		case "duration":
			return { kind: cst.kind as AstTimeType["kind"], span: cst.span };

		case "sequence":
			return lowerSequenceType(cst);
		case "set":
			return lowerSetType(cst);
		case "sequenceOf":
			return lowerSequenceOfType(cst);
		case "setOf":
			return lowerSetOfType(cst);
		case "choice":
			return lowerChoiceType(cst);
		case "taggedType":
			return lowerTaggedType(cst);
		case "constrainedType":
			return {
				kind: "constrained",
				span: cst.span,
				baseType: lowerType(cst.baseType),
				constraint: lowerConstraintSpec(cst.constraint.spec),
			};
		case "referencedType":
			return lowerReferencedType(cst);
	}
}

function lowerIntegerType(cst: CstBuiltinPrimitiveType): AstIntegerType {
	const namedNumbers: AstNamedNumber[] = (cst.namedValues ?? []).map((nv) => ({
		name: nv.name.text,
		value: BigInt(nv.number.text),
	}));
	return { kind: "integer", span: cst.span, namedNumbers };
}

function lowerBitStringType(cst: CstBuiltinPrimitiveType): AstBitStringType {
	const namedBits: AstNamedBit[] = (cst.namedValues ?? []).map((nv) => ({
		name: nv.name.text,
		index: parseInt(nv.number.text, 10),
	}));
	return { kind: "bitString", span: cst.span, namedBits };
}

function lowerEnumeratedType(cst: CstBuiltinPrimitiveType): AstEnumeratedType {
	const values: AstNamedNumber[] = (cst.namedValues ?? []).map((nv) => ({
		name: nv.name.text,
		value: BigInt(nv.number.text),
	}));
	return { kind: "enumerated", span: cst.span, values, extensible: false };
}

function lowerSequenceType(cst: CstSequenceType): AstSequenceType {
	return {
		kind: "sequence",
		span: cst.span,
		components: cst.components.map(lowerSeqComponent),
	};
}

function lowerSetType(cst: CstSetType): AstSetType {
	return {
		kind: "set",
		span: cst.span,
		components: cst.components.map(lowerSeqComponent),
	};
}

function lowerSeqComponent(
	cst: CstSequenceOrSetComponent,
): AstComponent | AstExtensionMarker | AstExtensionAdditionGroup {
	if (cst.kind === "extensionMarker")
		return { kind: "extensionMarker", span: cst.span };
	if (cst.kind === "extensionAdditionGroup") {
		return {
			kind: "extensionAdditionGroup",
			span: cst.span,
			version: cst.version ? parseInt(cst.version.text, 10) : undefined,
			components: cst.components.map(lowerComponent),
		};
	}
	if (cst.kind === "componentsOf") {
		// COMPONENTS OF — treat as a synthetic component placeholder; the compiler resolves this
		return {
			kind: "component",
			span: cst.span,
			name: "__componentsOf__",
			type: lowerType(cst.type),
			optional: false,
			defaultValue: undefined,
		};
	}
	return lowerComponent(cst);
}

function lowerComponent(cst: CstComponentType): AstComponent {
	return {
		kind: "component",
		span: cst.span,
		name: cst.name.text,
		type: lowerType(cst.type),
		optional: cst.optional,
		defaultValue:
			cst.defaultValue === undefined ? undefined : lowerValue(cst.defaultValue),
	};
}

function lowerSequenceOfType(cst: CstSequenceOfType): AstSequenceOfType {
	return {
		kind: "sequenceOf",
		span: cst.span,
		constraint: cst.constraint
			? lowerConstraintSpec(cst.constraint.spec)
			: undefined,
		elementType: lowerType(cst.elementType),
	};
}

function lowerSetOfType(cst: CstSetOfType): AstSetOfType {
	return {
		kind: "setOf",
		span: cst.span,
		constraint: cst.constraint
			? lowerConstraintSpec(cst.constraint.spec)
			: undefined,
		elementType: lowerType(cst.elementType),
	};
}

function lowerChoiceType(cst: CstChoiceType): AstChoiceType {
	return {
		kind: "choice",
		span: cst.span,
		alternatives: cst.alternatives.map((alt) => {
			if (alt.kind === "extensionMarker")
				return { kind: "extensionMarker" as const, span: alt.span };
			if (alt.kind === "extensionAdditionGroup") {
				return {
					kind: "extensionAdditionGroup" as const,
					span: alt.span,
					version: alt.version ? parseInt(alt.version.text, 10) : undefined,
					components: alt.components.map(lowerComponent),
				};
			}
			return lowerAlternative(alt);
		}),
	};
}

function lowerAlternative(cst: CstAlternativeType): AstAlternative {
	return {
		kind: "alternative",
		span: cst.span,
		name: cst.name.text,
		type: lowerType(cst.type),
	};
}

function lowerTaggedType(cst: CstTaggedType): AstTaggedType {
	return {
		kind: "tagged",
		span: cst.span,
		tagClass: cst.tagClass,
		tagNumber: parseInt(cst.tagNumber.text, 10),
		mode: cst.mode,
		innerType: lowerType(cst.innerType),
	};
}

function lowerReferencedType(cst: CstReferencedType): AstTypeReference {
	return {
		kind: "typeReference",
		span: cst.span,
		name: cst.name.text,
		actualParams: cst.actualParams?.map(lowerActualParam),
	};
}

/**
 * An actual parameter is a type or a value, and which one is only decided by
 * the governing formal parameter, which the compiler resolves. A numeric
 * literal lowers to `bigint`, any other token to its text, and a type to the
 * lowered type.
 */
function lowerActualParam(cst: CstActualParam): AnyAstType | bigint | string {
	if (cst.value.kind === "tokenLiteral") {
		const { token } = cst.value;
		return token.kind === TokenKind.Number ? BigInt(token.text) : token.text;
	}
	return lowerType(cst.value);
}

/**
 * A range bound is a number, a character string, or a named value reference the
 * compiler resolves later. Only the first is a `bigint`.
 */
function lowerRangeBound(token: Token): bigint | AstStringBound {
	if (token.kind === TokenKind.Number || /^-?\d+$/.test(token.text)) {
		return BigInt(token.text);
	}
	return {
		kind: "stringBound",
		text:
			token.kind === TokenKind.CharString
				? token.text.slice(1, -1)
				: token.text,
	};
}

export function lowerConstraintSpec(cst: CstConstraintSpec): AnyAstConstraint {
	switch (cst.kind) {
		case "valueRange": {
			const min = cst.lower === "MIN" ? "MIN" : lowerRangeBound(cst.lower);
			const max = cst.upper === "MAX" ? "MAX" : lowerRangeBound(cst.upper);
			return { kind: "valueRange", span: cst.span, min, max };
		}
		case "size":
			return {
				kind: "size",
				span: cst.span,
				constraint: lowerConstraintSpec(cst.constraint.spec),
			};
		case "permittedAlphabet":
			return {
				kind: "permittedAlphabet",
				span: cst.span,
				constraint: lowerConstraintSpec(cst.constraint.spec),
			};
		case "contentsConstraint":
			return {
				kind: "contentsConstraint",
				span: cst.span,
				containingType: lowerType(cst.containingType),
			};
		case "withComponents":
			return {
				kind: "withComponents",
				span: cst.span,
				partial: cst.partial,
				components: cst.components.map((c) => ({
					name: c.name.text,
					constraint: c.constraint
						? lowerConstraintSpec(c.constraint.spec)
						: undefined,
					presence: c.presence,
				})),
			};
		case "union":
			return {
				kind: "union",
				span: cst.span,
				operands: cst.operands.map(lowerConstraintSpec),
			};
		case "intersection":
			return {
				kind: "intersection",
				span: cst.span,
				operands: cst.operands.map(lowerConstraintSpec),
			};
		case "extensible":
			return {
				kind: "extensible",
				span: cst.span,
				base: lowerConstraintSpec(cst.base),
				extension: cst.extension
					? lowerConstraintSpec(cst.extension)
					: undefined,
			};
	}
}

function lowerValue(cst: CstAnyValue): AnyAstValue {
	switch (cst.kind) {
		case "literal": {
			const t = cst.token;
			if (t.kind === TokenKind.KwTrue)
				return { kind: "boolean", span: cst.span, value: true };
			if (t.kind === TokenKind.KwFalse)
				return { kind: "boolean", span: cst.span, value: false };
			if (t.kind === TokenKind.KwNull) return { kind: "null", span: cst.span };
			if (t.kind === TokenKind.Number)
				return { kind: "integer", span: cst.span, value: BigInt(t.text) };
			if (t.kind === TokenKind.CharString)
				return { kind: "string", span: cst.span, value: t.text.slice(1, -1) };
			if (t.kind === TokenKind.HexString)
				return { kind: "bitString", span: cst.span, hex: t.text };
			return { kind: "integer", span: cst.span, value: 0n };
		}
		case "oidValue":
			return { kind: "oid", span: cst.span, components: lowerOid(cst) };
		case "sequenceValue":
			return {
				kind: "sequence",
				span: cst.span,
				fields: cst.fields.map((f) => ({
					name: f.name.text,
					value: lowerValue(f.value),
				})),
			};
		case "choiceValue":
			return {
				kind: "choice",
				span: cst.span,
				alternative: cst.alternative.text,
				value: lowerValue(cst.value),
			};
	}
}
