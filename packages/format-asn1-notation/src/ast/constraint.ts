import type { Span } from "../span.js";
import type { AnyAstType } from "./type.js";

export type AnyAstConstraint =
	| AstValueRangeConstraint
	| AstSizeConstraint
	| AstPermittedAlphabetConstraint
	| AstContentsConstraint
	| AstUnionConstraint
	| AstIntersectionConstraint
	| AstExtensibleConstraint
	| AstWithComponentsConstraint;

interface AstBaseConstraint {
	readonly span: Span;
}

/**
 * A non-numeric range bound: the `"a"` in `FROM ("a".."z")`, or a named value
 * reference the compiler resolves. Kept distinct from the `"MIN"`/`"MAX"`
 * sentinels so a bound whose text is literally `MIN` cannot be mistaken for
 * one.
 */
export interface AstStringBound {
	readonly kind: "stringBound";
	/** As written, with any surrounding quotes removed. */
	readonly text: string;
}

export interface AstValueRangeConstraint extends AstBaseConstraint {
	readonly kind: "valueRange";
	readonly min: bigint | AstStringBound | "MIN";
	readonly max: bigint | AstStringBound | "MAX";
}

export interface AstSizeConstraint extends AstBaseConstraint {
	readonly kind: "size";
	readonly constraint: AnyAstConstraint;
}

export interface AstPermittedAlphabetConstraint extends AstBaseConstraint {
	readonly kind: "permittedAlphabet";
	readonly constraint: AnyAstConstraint;
}

export interface AstContentsConstraint extends AstBaseConstraint {
	readonly kind: "contentsConstraint";
	readonly containingType: AnyAstType;
}

export interface AstUnionConstraint extends AstBaseConstraint {
	readonly kind: "union";
	readonly operands: readonly AnyAstConstraint[];
}

export interface AstIntersectionConstraint extends AstBaseConstraint {
	readonly kind: "intersection";
	readonly operands: readonly AnyAstConstraint[];
}

export interface AstExtensibleConstraint extends AstBaseConstraint {
	readonly kind: "extensible";
	readonly base: AnyAstConstraint;
	readonly extension: AnyAstConstraint | undefined;
}

export interface AstWithComponentsConstraint extends AstBaseConstraint {
	readonly kind: "withComponents";
	readonly partial: boolean;
	readonly components: readonly AstWithComponent[];
}

export interface AstWithComponent {
	readonly name: string;
	readonly constraint: AnyAstConstraint | undefined;
	readonly presence: "PRESENT" | "ABSENT" | "OPTIONAL" | undefined;
}
