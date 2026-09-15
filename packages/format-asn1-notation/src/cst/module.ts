import type { Span } from "../span.js";
import type { Token } from "../token.js";
import type { CstAnyAssignment } from "./assignment.js";

export interface CstModuleDefinition {
	readonly kind: "moduleDefinition";
	readonly span: Span;
	readonly moduleIdentifier: CstModuleIdentifier;
	readonly tagDefault: CstTagDefault | undefined;
	readonly extensibilityImplied: boolean;
	readonly body: CstModuleBody;
	readonly endToken: Token;
}

export interface CstModuleIdentifier {
	readonly kind: "moduleIdentifier";
	readonly span: Span;
	readonly name: Token;
	readonly oid: CstOidValue | undefined;
}

export interface CstTagDefault {
	readonly kind: "tagDefault";
	readonly span: Span;
	readonly mode: "explicit" | "implicit" | "automatic";
}

export interface CstModuleBody {
	readonly kind: "moduleBody";
	readonly span: Span;
	readonly exports: CstExports | undefined;
	readonly imports: CstImports | undefined;
	readonly assignments: readonly CstAnyAssignment[];
}

export interface CstExports {
	readonly kind: "exports";
	readonly span: Span;
	/** `undefined` means EXPORTS ALL */
	readonly symbols: readonly Token[] | undefined;
}

export interface CstImports {
	readonly kind: "imports";
	readonly span: Span;
	readonly symbolsFromModules: readonly CstSymbolsFromModule[];
}

export interface CstSymbolsFromModule {
	readonly kind: "symbolsFromModule";
	readonly span: Span;
	readonly symbols: readonly Token[];
	readonly module: Token;
	readonly oid: CstOidValue | undefined;
}

export interface CstOidValue {
	readonly kind: "oidValue";
	readonly span: Span;
	readonly components: readonly CstOidComponent[];
}

export type CstOidComponent =
	| { readonly kind: "oidNumber"; readonly span: Span; readonly token: Token }
	| { readonly kind: "oidName"; readonly span: Span; readonly token: Token }
	| {
			readonly kind: "oidNameAndNumber";
			readonly span: Span;
			readonly name: Token;
			readonly number: Token;
	  };
