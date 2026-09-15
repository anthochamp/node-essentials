import { AnyAsn1TypeDef } from "@ac-kit/format-asn1";
import {
	AnyAstType,
	AstModule,
	AstTypeAssignment,
	syntheticSpan,
} from "@ac-kit/format-asn1-notation";

/**
 * Generate `AstModule[]` from compiled defs — structural inverse of
 * `compileModules`. Synthesised nodes use zero-length spans.
 */
export function decompileModules(
	defs: ReadonlyMap<string, ReadonlyMap<string, AnyAsn1TypeDef>>,
): AstModule[] {
	const result: AstModule[] = [];
	for (const [moduleName, moduleDefs] of defs) {
		const assignments: AstTypeAssignment[] = [];
		for (const [name, def] of moduleDefs) {
			assignments.push({
				kind: "typeAssignment",
				span: syntheticSpan(),
				name,
				params: undefined,
				type: defToType(def, moduleDefs),
			});
		}
		result.push({
			kind: "module",
			span: syntheticSpan(),
			name: moduleName,
			oid: undefined,
			tagDefault: "none",
			extensibilityImplied: false,
			exports: "all",
			imports: [],
			assignments,
		});
	}
	return result;
}

function defToType(
	def: AnyAsn1TypeDef,
	moduleDefs: ReadonlyMap<string, AnyAsn1TypeDef>,
): AnyAstType {
	const s = syntheticSpan();
	switch (def.kind) {
		case "boolean":
			return { kind: "boolean", span: s };
		case "null":
			return { kind: "null", span: s };
		case "octetString":
			return { kind: "octetString", span: s };
		case "objectIdentifier":
			return { kind: "objectIdentifier", span: s };
		case "relativeOid":
			return { kind: "relativeOid", span: s };
		case "oidIri":
			return { kind: "oidIri", span: s };
		case "relativeOidIri":
			return { kind: "relativeOidIri", span: s };
		case "real":
			return { kind: "real", span: s };
		case "any":
			return { kind: "any", span: s };
		case "external":
			return { kind: "external", span: s };
		case "embeddedPdv":
			return { kind: "embeddedPdv", span: s };
		case "characterString":
			return { kind: "characterString", span: s };

		case "integer":
			return {
				kind: "integer",
				span: s,
				namedNumbers: (def.namedNumbers ?? []).map((n) => ({
					name: n.name,
					value: n.value,
				})),
			};
		case "bitString":
			return {
				kind: "bitString",
				span: s,
				namedBits: (def.namedBits ?? []).map((b) => ({
					name: b.name,
					index: b.index,
				})),
			};
		case "enumerated":
			return {
				kind: "enumerated",
				span: s,
				values: (def.namedNumbers ?? []).map((n) => ({
					name: n.name,
					value: n.value,
				})),
				extensible: false,
			};

		case "utf8String":
			return { kind: "utf8String", span: s };
		case "numericString":
			return { kind: "numericString", span: s };
		case "printableString":
			return { kind: "printableString", span: s };
		case "teletexString":
			return { kind: "teletexString", span: s };
		case "videotexString":
			return { kind: "videotexString", span: s };
		case "ia5String":
			return { kind: "ia5String", span: s };
		case "graphicString":
			return { kind: "graphicString", span: s };
		case "visibleString":
			return { kind: "visibleString", span: s };
		case "generalString":
			return { kind: "generalString", span: s };
		case "universalString":
			return { kind: "universalString", span: s };
		case "bmpString":
			return { kind: "bmpString", span: s };

		case "utcTime":
			return { kind: "utcTime", span: s };
		case "generalizedTime":
			return { kind: "generalizedTime", span: s };
		case "time":
			return { kind: "time", span: s };
		case "date":
			return { kind: "date", span: s };
		case "timeOfDay":
			return { kind: "timeOfDay", span: s };
		case "dateTime":
			return { kind: "dateTime", span: s };
		case "duration":
			return { kind: "duration", span: s };

		case "sequence":
			return {
				kind: "sequence",
				span: s,
				components: def.components.map((c: any) => {
					if (c.kind === "extensionMarker")
						return { kind: "extensionMarker" as const, span: s };
					if (c.kind === "extensionAdditionGroup")
						return {
							kind: "extensionAdditionGroup" as const,
							span: s,
							version: c.version,
							components: c.components.map((comp: any) => ({
								kind: "component" as const,
								span: s,
								name: comp.name,
								type: defToType(comp.type, moduleDefs),
								optional: comp.optional,
								defaultValue: undefined,
							})),
						};
					return {
						kind: "component" as const,
						span: s,
						name: c.name,
						type: defToType(c.type, moduleDefs),
						optional: c.optional,
						defaultValue: undefined,
					};
				}),
			};
		case "set":
			return {
				kind: "set",
				span: s,
				components: def.components.map((c: any) => {
					if (c.kind === "extensionMarker")
						return { kind: "extensionMarker" as const, span: s };
					if (c.kind === "extensionAdditionGroup")
						return {
							kind: "extensionAdditionGroup" as const,
							span: s,
							version: c.version,
							components: c.components.map((comp: any) => ({
								kind: "component" as const,
								span: s,
								name: comp.name,
								type: defToType(comp.type, moduleDefs),
								optional: comp.optional,
								defaultValue: undefined,
							})),
						};
					return {
						kind: "component" as const,
						span: s,
						name: c.name,
						type: defToType(c.type, moduleDefs),
						optional: c.optional,
						defaultValue: undefined,
					};
				}),
			};
		case "sequenceOf":
			return {
				kind: "sequenceOf",
				span: s,
				constraint: undefined,
				elementType: defToType(def.elementType, moduleDefs),
			};
		case "setOf":
			return {
				kind: "setOf",
				span: s,
				constraint: undefined,
				elementType: defToType(def.elementType, moduleDefs),
			};
		case "choice":
			return {
				kind: "choice",
				span: s,
				alternatives: (def.alternatives ?? []).map((a: any) => {
					if (a.kind === "extensionMarker")
						return { kind: "extensionMarker" as const, span: s };
					return {
						kind: "alternative" as const,
						span: s,
						name: a.name,
						type: defToType(a.type, moduleDefs),
					};
				}),
			};
		case "tagged":
			return {
				kind: "tagged",
				span: s,
				tagClass: def.tag.tagClass,
				tagNumber: def.tag.tagNumber,
				mode: def.mode,
				innerType: defToType(def.innerType, moduleDefs),
			};
		case "transform":
			return defToType(def.innerType, moduleDefs);
		case "lazy": {
			// Resolve the lazy to find the name
			const resolved = def.getter() as unknown as AnyAsn1TypeDef;
			// Find the name in module defs
			for (const [name, d] of moduleDefs) {
				if (d === def || d === resolved) {
					return {
						kind: "typeReference",
						span: s,
						name,
						actualParams: undefined,
					};
				}
			}
			return defToType(resolved, moduleDefs);
		}
		default:
			return { kind: "any", span: s };
	}
}
