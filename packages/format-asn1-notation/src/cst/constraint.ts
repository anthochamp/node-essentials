import type { Span } from "../span.js";
import type { Token } from "../token.js";
import type { CstAnyType } from "./type.js";

export interface CstConstraint {
	readonly kind: "constraint";
	readonly span: Span;
	readonly spec: CstConstraintSpec;
}

export type CstConstraintSpec =
	| CstValueRangeConstraint
	| CstSizeConstraint
	| CstPermittedAlphabetConstraint
	| CstContentsConstraint
	| CstInnerTypeConstraints
	| CstUnionConstraint
	| CstIntersectionConstraint
	| CstExtensibleConstraint;

export interface CstValueRangeConstraint {
	readonly kind: "valueRange";
	readonly span: Span;
	readonly lower: Token | "MIN";
	readonly upperInclusive: boolean;
	readonly upper: Token | "MAX";
}

export interface CstSizeConstraint {
	readonly kind: "size";
	readonly span: Span;
	readonly constraint: CstConstraint;
}

export interface CstPermittedAlphabetConstraint {
	readonly kind: "permittedAlphabet";
	readonly span: Span;
	readonly constraint: CstConstraint;
}

export interface CstContentsConstraint {
	readonly kind: "contentsConstraint";
	readonly span: Span;
	readonly containingType: CstAnyType;
	readonly encodedBy: Token | undefined;
}

export interface CstInnerTypeConstraints {
	readonly kind: "withComponents";
	readonly span: Span;
	readonly partial: boolean;
	readonly components: readonly CstWithComponent[];
}

export interface CstWithComponent {
	readonly kind: "withComponent";
	readonly span: Span;
	readonly name: Token;
	readonly constraint: CstConstraint | undefined;
	readonly presence: "PRESENT" | "ABSENT" | "OPTIONAL" | undefined;
}

export interface CstUnionConstraint {
	readonly kind: "union";
	readonly span: Span;
	readonly operands: readonly CstConstraintSpec[];
}

export interface CstIntersectionConstraint {
	readonly kind: "intersection";
	readonly span: Span;
	readonly operands: readonly CstConstraintSpec[];
}

export interface CstExtensibleConstraint {
	readonly kind: "extensible";
	readonly span: Span;
	readonly base: CstConstraintSpec;
	readonly extension: CstConstraintSpec | undefined;
}
