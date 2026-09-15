import { AnyAsn1TypeDef } from "./types/any-def.js";
import { ref, type Asn1TaggedTypeDef, type Asn1Type } from "./types/base.js";
import type { Asn1ChoiceTypeDef } from "./types/constructed/choice.js";
import type {
	Asn1ComponentDef,
	Asn1ExtensionAdditionGroupDef,
	Asn1SequenceComponentDescriptorDef,
} from "./types/constructed/component.js";
import type { Asn1SequenceTypeDef } from "./types/constructed/sequence.js";
import type { Asn1SetTypeDef } from "./types/constructed/set.js";

// ── Module options ─────────────────────────────────────────────────────────────

/** Module import declaration entry. */
export type Asn1ModuleImportDef = {
	readonly from: string;
	readonly names: readonly string[];
};

/** ASN.1 module descriptor. */
export type Asn1ModuleDef = {
	readonly kind: "module";
	readonly name: string;
	readonly oid?: readonly number[];
	readonly tagging?: "automatic" | "implicit" | "explicit";
	readonly extensibilityImplied?: boolean;
	readonly exports: "all" | readonly string[];
	readonly imports: readonly Asn1ModuleImportDef[];
	readonly rawTypes: Readonly<Record<string, AnyAsn1TypeDef>>;
	readonly processedTypes: Readonly<Record<string, AnyAsn1TypeDef>>;
};

// ── Module options ─────────────────────────────────────────────────────────────

/** Configuration options passed to `defineModule()`. */
export interface ModuleOptions {
	readonly name: string;
	readonly oid?: readonly number[];
	readonly tagging?: "automatic" | "implicit" | "explicit";
	readonly extensibilityImplied?: boolean;
	/** `"all"` or an explicit list of exported type names. */
	readonly exports?: "all" | readonly string[];
	readonly imports?: readonly Asn1ModuleImportDef[];
}

// ── Asn1Module ───────────────────────────────────────────────────────────────

/**
 * An ASN.1 module definition. `Types` is a record mapping type assignment names
 * to their def trees.
 */
export type Asn1Module<Types extends Readonly<Record<string, AnyAsn1TypeDef>>> =
	{
		readonly def: Asn1ModuleDef;
		readonly processedTypes: Types;
	};

/**
 * Factory for creating an ASN.1 module definition.
 *
 * @example
 * 	```typescript
 * 	const MyModule = module(
 * 		{ name: "MyModule", tagging: "automatic" },
 * 		{ MyType: integer() },
 * 	);
 * 	```;
 */
export function module<
	Types extends Readonly<Record<string, Asn1Type<AnyAsn1TypeDef>>>,
>(
	options: ModuleOptions,
	types: Types,
): Asn1Module<{ readonly [K in keyof Types]: AnyAsn1TypeDef }> {
	type RawTypes = { readonly [K in keyof Types]: AnyAsn1TypeDef };
	const rawTypes: Record<string, AnyAsn1TypeDef> = {};
	for (const [name, schema] of Object.entries(types)) {
		rawTypes[name] = ref(schema);
	}
	const processed = applyModuleTagging_(rawTypes, options.tagging) as RawTypes;
	return {
		processedTypes: processed,
		def: {
			kind: "module",
			name: options.name,
			...(options.oid !== undefined ? { oid: options.oid } : {}),
			...(options.tagging !== undefined ? { tagging: options.tagging } : {}),
			...(options.extensibilityImplied !== undefined
				? { extensibilityImplied: options.extensibilityImplied }
				: {}),
			exports: options.exports ?? "all",
			imports: options.imports ?? [],
			rawTypes,
			processedTypes: processed,
		},
	};
}

/**
 * Applies the module-level tagging option to all types in a module. For
 * `automatic` tagging, this will assign `[0]`, `[1]`, `[2]`, … to untagged
 * SEQUENCE/SET components and CHOICE alternatives. For `implicit` tagging, this
 * will convert EXPLICIT tags to IMPLICIT where applicable.
 */
function applyModuleTagging_(
	types: Readonly<Record<string, AnyAsn1TypeDef>>,
	tagging: "automatic" | "implicit" | "explicit" | undefined,
): Readonly<Record<string, AnyAsn1TypeDef>> {
	if (tagging === undefined || tagging === "explicit") {
		return types;
	}
	const result: Record<string, AnyAsn1TypeDef> = {};
	for (const [name, def] of Object.entries(types)) {
		if (tagging === "automatic") {
			result[name] = applyAutomaticTagging_(def);
		} else {
			result[name] = applyImplicitTagging_(def);
		}
	}
	return result;
}

/**
 * Apply AUTOMATIC TAGS to a def: assign `[0]`, `[1]`, `[2]`, … in order to
 * untagged SEQUENCE/SET components. Pre-tagged components are skipped in the
 * counter.
 */
function applyAutomaticTagging_(def: AnyAsn1TypeDef): AnyAsn1TypeDef {
	if (def.kind !== "sequence" && def.kind !== "set" && def.kind !== "choice") {
		return def;
	}
	let counter = 0;
	const processedComponents = (def as Asn1SequenceTypeDef | Asn1SetTypeDef)
		.components
		? ((def as Asn1SequenceTypeDef | Asn1SetTypeDef).components.map((comp) => {
				if (comp.kind === "extensionMarker") return comp;
				if (comp.kind === "componentsOf") return comp;
				if (comp.kind === "extensionAdditionGroup") {
					let innerCounter = counter;
					const newComponents = comp.components.map((c: Asn1ComponentDef) => {
						if (isAlreadyTagged_(c)) {
							innerCounter++;
							return c;
						}
						const tagged = wrapWithContextTag_(
							c.type,
							innerCounter,
							"implicit",
						);
						innerCounter++;
						return { ...c, type: tagged };
					});
					counter = innerCounter;
					return {
						...comp,
						components: newComponents,
					} as Asn1ExtensionAdditionGroupDef;
				}
				// Asn1ComponentDef
				const c = comp as Asn1ComponentDef;
				if (isAlreadyTagged_(c)) {
					counter++;
					return c;
				}
				const tagged = wrapWithContextTag_(c.type, counter, "implicit");
				counter++;
				return { ...c, type: tagged };
			}) as Asn1SequenceComponentDescriptorDef[])
		: undefined;

	if (def.kind === "choice") {
		let altCounter = 0;
		const alternatives = (def as Asn1ChoiceTypeDef).alternatives.map((alt) => {
			if ("kind" in alt && alt.kind === "extensionMarker") return alt;
			if ("kind" in alt && alt.kind === "extensionAdditionGroup") return alt;
			const altDef = alt as {
				readonly name: string;
				readonly type: AnyAsn1TypeDef;
			};
			if (isAltTagged_(altDef)) {
				altCounter++;
				return alt;
			}
			const tagged = wrapWithContextTag_(altDef.type, altCounter, "implicit");
			altCounter++;
			return { ...altDef, type: tagged };
		});
		return { ...def, alternatives } as Asn1ChoiceTypeDef;
	}

	return { ...def, components: processedComponents } as AnyAsn1TypeDef;
}

/**
 * Applies IMPLICIT tagging to a def: convert EXPLICIT tags to IMPLICIT where
 * applicable. This is used for the `IMPLICIT TAGS` module option.
 */
function applyImplicitTagging_(def: AnyAsn1TypeDef): AnyAsn1TypeDef {
	if (def.kind === "tagged") {
		return { ...def, mode: "implicit" } as Asn1TaggedTypeDef;
	}
	return def;
}

/**
 * Wraps a def with a context-specific tag. Used for automatic tagging of
 * SEQUENCE/SET components and CHOICE alternatives. The `mode` is always
 * `"implicit"` for automatic tagging.
 */
function wrapWithContextTag_(
	innerDef: AnyAsn1TypeDef,
	tagNumber: number,
	mode: "implicit" | "explicit",
): Asn1TaggedTypeDef {
	return {
		kind: "tagged",
		tag: { tagClass: "context", tagNumber },
		mode,
		innerType: innerDef,
	};
}

function isAlreadyTagged_(comp: Asn1ComponentDef): boolean {
	return comp.type.kind === "tagged";
}

function isAltTagged_(alt: { type: AnyAsn1TypeDef }): boolean {
	return alt.type.kind === "tagged";
}
