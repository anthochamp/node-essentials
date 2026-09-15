import type { Span } from "../span.js";
import type { Token } from "../token.js";
import type { CstAnyType } from "./type.js";
import type { CstAnyValue } from "./value.js";

export interface CstTypeAssignment {
	readonly kind: "typeAssignment";
	readonly span: Span;
	readonly name: Token;
	readonly params: CstParameterList | undefined;
	readonly type: CstAnyType;
}

export interface CstValueAssignment {
	readonly kind: "valueAssignment";
	readonly span: Span;
	readonly name: Token;
	readonly type: CstAnyType;
	readonly value: CstAnyValue;
}

export interface CstParameterList {
	readonly kind: "parameterList";
	readonly span: Span;
	readonly params: readonly CstParameter[];
}

export interface CstParameter {
	readonly kind: "parameter";
	readonly span: Span;
	/**
	 * Governor is the type constraining the parameter (e.g. "INTEGER" for value
	 * params).
	 */
	readonly governor: CstAnyType | undefined;
	readonly name: Token;
}

export type CstAnyAssignment = CstTypeAssignment | CstValueAssignment;
