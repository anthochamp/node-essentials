import type { Span } from "../span.js";
import type { Token } from "../token.js";
import type { CstOidValue } from "./module.js";

export type CstAnyValue =
	| CstLiteralValue
	| CstOidValue
	| CstSequenceValue
	| CstChoiceValue;

export interface CstLiteralValue {
	readonly kind: "literal";
	readonly span: Span;
	readonly token: Token;
}

export interface CstSequenceValue {
	readonly kind: "sequenceValue";
	readonly span: Span;
	readonly fields: readonly CstNamedValuePair[];
}

export interface CstNamedValuePair {
	readonly kind: "namedValuePair";
	readonly span: Span;
	readonly name: Token;
	readonly value: CstAnyValue;
}

export interface CstChoiceValue {
	readonly kind: "choiceValue";
	readonly span: Span;
	readonly alternative: Token;
	readonly value: CstAnyValue;
}
