import type { Span } from "../span.js";
import type { AnyAstAssignment } from "./assignment.js";

export type TagDefault = "explicit" | "implicit" | "automatic" | "none";
export type ExtensibilityMode = "implied" | "none";

export interface AstModule {
	readonly kind: "module";
	readonly span: Span;
	readonly name: string;
	readonly oid: readonly number[] | undefined;
	readonly tagDefault: TagDefault;
	readonly extensibilityImplied: boolean;
	readonly exports: AstExport;
	readonly imports: readonly AstImport[];
	readonly assignments: readonly AnyAstAssignment[];
}

/** `"all"` = EXPORTS ALL; string[] = explicit list */
export type AstExport = "all" | readonly string[];

export interface AstImport {
	readonly kind: "import";
	readonly span: Span;
	readonly symbols: readonly string[];
	readonly fromModule: string;
	readonly oid: readonly number[] | undefined;
}
