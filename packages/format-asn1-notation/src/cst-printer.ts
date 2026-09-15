import type { CstModuleDefinition } from "./cst/module.js";
import type { Span } from "./span.js";

/**
 * Lossless CST printer. Returns the exact source substring covered by the
 * node's span.
 *
 * Since every CST node carries `span: { start, end }` as byte offsets into the
 * original source string, the lossless output is simply
 * `source.slice(span.start, span.end)`. This is byte-for-byte identical to the
 * original input for any unmodified subtree.
 */
export function printCst(node: CstModuleDefinition, source: string): string {
	return source.slice(node.span.start, node.span.end);
}

/**
 * Extract the source text covered by any CST node or span. Useful for error
 * messages, diagnostic output, or extracting individual type definitions.
 */
export function printCstSpan(span: Span, source: string): string {
	return source.slice(span.start, span.end);
}
