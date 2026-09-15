import type { Span } from "../span.js";
import type { AnyAstType } from "./type.js";
import type { AnyAstValue } from "./value.js";

export interface AstTypeAssignment {
	readonly kind: "typeAssignment";
	readonly span: Span;
	readonly name: string;
	readonly params: readonly AstParamDef[] | undefined;
	readonly type: AnyAstType;
}

export interface AstValueAssignment {
	readonly kind: "valueAssignment";
	readonly span: Span;
	readonly name: string;
	readonly type: AnyAstType;
	readonly value: AnyAstValue;
}

export interface AstParamDef {
	readonly name: string;
	readonly governor: AnyAstType | undefined;
}

export type AnyAstAssignment = AstTypeAssignment | AstValueAssignment;
