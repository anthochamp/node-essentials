import type { Span } from "../span.js";
import type {
	AstComponent,
	AstAlternative,
	AstExtensionMarker,
	AstExtensionAdditionGroup,
} from "./component.js";
import type { AnyAstConstraint } from "./constraint.js";

export type AnyAstType =
	// Primitives
	| AstBooleanType
	| AstIntegerType
	| AstBitStringType
	| AstOctetStringType
	| AstNullType
	| AstObjectIdentifierType
	| AstRelativeOidType
	| AstOidIriType
	| AstRelativeOidIriType
	| AstRealType
	| AstEnumeratedType
	| AstAnyType
	// Strings
	| AstStringType
	// Times
	| AstTimeType
	// Constructed
	| AstSequenceType
	| AstSetType
	| AstChoiceType
	| AstSequenceOfType
	| AstSetOfType
	// Wrappers
	| AstTaggedType
	| AstConstrainedType
	// Reference (unresolved name)
	| AstTypeReference
	// Legacy OSI
	| AstExternalType
	| AstEmbeddedPdvType
	| AstCharacterStringType;

interface AstBaseType {
	readonly span: Span;
}

export interface AstBooleanType extends AstBaseType {
	readonly kind: "boolean";
}
export interface AstNullType extends AstBaseType {
	readonly kind: "null";
}
export interface AstOctetStringType extends AstBaseType {
	readonly kind: "octetString";
}
export interface AstObjectIdentifierType extends AstBaseType {
	readonly kind: "objectIdentifier";
}
export interface AstRelativeOidType extends AstBaseType {
	readonly kind: "relativeOid";
}
export interface AstOidIriType extends AstBaseType {
	readonly kind: "oidIri";
}
export interface AstRelativeOidIriType extends AstBaseType {
	readonly kind: "relativeOidIri";
}
export interface AstRealType extends AstBaseType {
	readonly kind: "real";
}
export interface AstAnyType extends AstBaseType {
	readonly kind: "any";
}
export interface AstExternalType extends AstBaseType {
	readonly kind: "external";
}
export interface AstEmbeddedPdvType extends AstBaseType {
	readonly kind: "embeddedPdv";
}
export interface AstCharacterStringType extends AstBaseType {
	readonly kind: "characterString";
}

export interface AstIntegerType extends AstBaseType {
	readonly kind: "integer";
	readonly namedNumbers: readonly AstNamedNumber[];
}

export interface AstBitStringType extends AstBaseType {
	readonly kind: "bitString";
	readonly namedBits: readonly AstNamedBit[];
}

export interface AstEnumeratedType extends AstBaseType {
	readonly kind: "enumerated";
	readonly values: readonly AstNamedNumber[];
	readonly extensible: boolean;
}

export interface AstNamedNumber {
	readonly name: string;
	readonly value: bigint;
}
export interface AstNamedBit {
	readonly name: string;
	readonly index: number;
}

export type StringKind =
	| "utf8String"
	| "numericString"
	| "printableString"
	| "teletexString"
	| "videotexString"
	| "ia5String"
	| "graphicString"
	| "visibleString"
	| "generalString"
	| "universalString"
	| "bmpString"
	| "objectDescriptor";

export type TimeKind =
	| "utcTime"
	| "generalizedTime"
	| "time"
	| "date"
	| "timeOfDay"
	| "dateTime"
	| "duration";

export interface AstStringType extends AstBaseType {
	readonly kind: StringKind;
}
export interface AstTimeType extends AstBaseType {
	readonly kind: TimeKind;
}

export interface AstSequenceType extends AstBaseType {
	readonly kind: "sequence";
	readonly components: readonly (
		| AstComponent
		| AstExtensionMarker
		| AstExtensionAdditionGroup
	)[];
}

export interface AstSetType extends AstBaseType {
	readonly kind: "set";
	readonly components: readonly (
		| AstComponent
		| AstExtensionMarker
		| AstExtensionAdditionGroup
	)[];
}

export interface AstChoiceType extends AstBaseType {
	readonly kind: "choice";
	readonly alternatives: readonly (
		| AstAlternative
		| AstExtensionMarker
		| AstExtensionAdditionGroup
	)[];
}

export interface AstSequenceOfType extends AstBaseType {
	readonly kind: "sequenceOf";
	readonly constraint: AnyAstConstraint | undefined;
	readonly elementType: AnyAstType;
}

export interface AstSetOfType extends AstBaseType {
	readonly kind: "setOf";
	readonly constraint: AnyAstConstraint | undefined;
	readonly elementType: AnyAstType;
}

export interface AstTaggedType extends AstBaseType {
	readonly kind: "tagged";
	readonly tagClass: "context" | "application" | "private" | "universal";
	readonly tagNumber: number;
	readonly mode: "implicit" | "explicit" | "automatic" | undefined;
	readonly innerType: AnyAstType;
}

export interface AstConstrainedType extends AstBaseType {
	readonly kind: "constrained";
	readonly baseType: AnyAstType;
	readonly constraint: AnyAstConstraint;
}

/** Unresolved type reference — resolved by the compiler. */
export interface AstTypeReference extends AstBaseType {
	readonly kind: "typeReference";
	readonly name: string;
	readonly actualParams: readonly (AnyAstType | bigint | string)[] | undefined;
}
