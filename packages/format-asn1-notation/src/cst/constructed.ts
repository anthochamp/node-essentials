import type { Span } from "../span.js";
import type { Token } from "../token.js";
import type { CstConstraint } from "./constraint.js";
import type { CstAnyType } from "./type.js";
import type { CstAnyValue } from "./value.js";

export interface CstComponentType {
	readonly kind: "component";
	readonly span: Span;
	readonly name: Token;
	readonly type: CstAnyType;
	readonly optional: boolean;
	readonly defaultValue: CstAnyValue | undefined;
}

export interface CstComponentsOf {
	readonly kind: "componentsOf";
	readonly span: Span;
	readonly type: CstAnyType;
}

export interface CstExtensionMarker {
	readonly kind: "extensionMarker";
	readonly span: Span;
}

export interface CstExtensionAdditionGroup {
	readonly kind: "extensionAdditionGroup";
	readonly span: Span;
	readonly version: Token | undefined;
	readonly components: readonly CstComponentType[];
}

export type CstSequenceOrSetComponent =
	| CstComponentType
	| CstComponentsOf
	| CstExtensionMarker
	| CstExtensionAdditionGroup;

export interface CstSequenceType {
	readonly kind: "sequence";
	readonly span: Span;
	readonly components: readonly CstSequenceOrSetComponent[];
}

export interface CstSetType {
	readonly kind: "set";
	readonly span: Span;
	readonly components: readonly CstSequenceOrSetComponent[];
}

export interface CstSequenceOfType {
	readonly kind: "sequenceOf";
	readonly span: Span;
	readonly constraint: CstConstraint | undefined;
	readonly elementType: CstAnyType;
}

export interface CstSetOfType {
	readonly kind: "setOf";
	readonly span: Span;
	readonly constraint: CstConstraint | undefined;
	readonly elementType: CstAnyType;
}

export interface CstAlternativeType {
	readonly kind: "alternative";
	readonly span: Span;
	readonly name: Token;
	readonly type: CstAnyType;
}

export type CstChoiceComponent =
	| CstAlternativeType
	| CstExtensionMarker
	| CstExtensionAdditionGroup;

export interface CstChoiceType {
	readonly kind: "choice";
	readonly span: Span;
	readonly alternatives: readonly CstChoiceComponent[];
}
