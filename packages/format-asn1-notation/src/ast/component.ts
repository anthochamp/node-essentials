import type { Span } from "../span.js";
import type { AnyAstType } from "./type.js";
import type { AnyAstValue } from "./value.js";

export interface AstComponent {
	readonly kind: "component";
	readonly span: Span;
	readonly name: string;
	readonly type: AnyAstType;
	readonly optional: boolean;
	readonly defaultValue: AnyAstValue | undefined;
}

export interface AstAlternative {
	readonly kind: "alternative";
	readonly span: Span;
	readonly name: string;
	readonly type: AnyAstType;
}

export interface AstExtensionMarker {
	readonly kind: "extensionMarker";
	readonly span: Span;
}

export interface AstExtensionAdditionGroup {
	readonly kind: "extensionAdditionGroup";
	readonly span: Span;
	readonly version: number | undefined;
	readonly components: readonly AstComponent[];
}

export interface AstComponentsOf {
	readonly kind: "componentsOf";
	readonly span: Span;
	readonly type: AnyAstType;
}
