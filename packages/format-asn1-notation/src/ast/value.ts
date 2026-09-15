import type { Span } from "../span.js";

export type AnyAstValue =
	| AstIntegerValue
	| AstBooleanValue
	| AstStringValue
	| AstBitStringValue
	| AstOidValue
	| AstNullValue
	| AstSequenceValue
	| AstChoiceValue;

interface AstBaseValue {
	readonly span: Span;
}

export interface AstIntegerValue extends AstBaseValue {
	readonly kind: "integer";
	readonly value: bigint;
}
export interface AstBooleanValue extends AstBaseValue {
	readonly kind: "boolean";
	readonly value: boolean;
}
export interface AstStringValue extends AstBaseValue {
	readonly kind: "string";
	readonly value: string;
}
export interface AstBitStringValue extends AstBaseValue {
	readonly kind: "bitString";
	readonly hex: string;
}
export interface AstOidValue extends AstBaseValue {
	readonly kind: "oid";
	readonly components: readonly number[];
}
export interface AstNullValue extends AstBaseValue {
	readonly kind: "null";
}

export interface AstSequenceValue extends AstBaseValue {
	readonly kind: "sequence";
	readonly fields: readonly AstNamedValuePair[];
}

export interface AstNamedValuePair {
	readonly name: string;
	readonly value: AnyAstValue;
}

export interface AstChoiceValue extends AstBaseValue {
	readonly kind: "choice";
	readonly alternative: string;
	readonly value: AnyAstValue;
}
