import type { Span } from "../span.js";
import type { Token } from "../token.js";
import type { CstConstraint } from "./constraint.js";
import type {
	CstSequenceType,
	CstSequenceOfType,
	CstSetType,
	CstSetOfType,
	CstChoiceType,
} from "./constructed.js";

/** A type referenced by name (TypeReference or parameterized instance). */
export interface CstReferencedType {
	readonly kind: "referencedType";
	readonly span: Span;
	readonly name: Token;
	readonly actualParams: readonly CstActualParam[] | undefined;
}

export interface CstActualParam {
	readonly span: Span;
	readonly value: CstAnyType | CstTokenLiteral;
}

export interface CstTokenLiteral {
	readonly kind: "tokenLiteral";
	readonly span: Span;
	readonly token: Token;
}

export interface CstTaggedType {
	readonly kind: "taggedType";
	readonly span: Span;
	readonly tagClass: "context" | "application" | "private" | "universal";
	readonly tagNumber: Token;
	readonly mode: "implicit" | "explicit" | "automatic" | undefined;
	readonly innerType: CstAnyType;
}

export interface CstConstrainedType {
	readonly kind: "constrainedType";
	readonly span: Span;
	readonly baseType: CstAnyType;
	readonly constraint: CstConstraint;
}

export interface CstBuiltinPrimitiveType {
	readonly kind:
		| "boolean"
		| "integer"
		| "bitString"
		| "octetString"
		| "null"
		| "objectIdentifier"
		| "relativeOid"
		| "oidIri"
		| "relativeOidIri"
		| "real"
		| "enumerated"
		| "any"
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
		| "utcTime"
		| "generalizedTime"
		| "time"
		| "date"
		| "timeOfDay"
		| "dateTime"
		| "duration"
		| "objectDescriptor"
		| "external"
		| "embeddedPdv"
		| "characterString";
	readonly span: Span;
	/** Token(s) that form this type name (e.g. ["BIT", "STRING"]). */
	readonly tokens: readonly Token[];
	/** Named numbers/bits for INTEGER/ENUMERATED/BIT STRING. */
	readonly namedValues?: readonly CstNamedValue[];
	/** Constraint inline with the type (e.g. SIZE(...)). */
	readonly constraint?: CstConstraint;
}

export interface CstNamedValue {
	readonly kind: "namedValue";
	readonly span: Span;
	readonly name: Token;
	readonly number: Token;
}

export type CstAnyType =
	| CstBuiltinPrimitiveType
	| CstSequenceType
	| CstSequenceOfType
	| CstSetType
	| CstSetOfType
	| CstChoiceType
	| CstTaggedType
	| CstConstrainedType
	| CstReferencedType;
