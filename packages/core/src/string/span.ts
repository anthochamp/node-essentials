/**
 * Half-open `[start, end)` range of (UTF-16) code unit offsets within a source
 * text.
 */
export interface Span {
	readonly start: number;
	readonly end: number;
}

/** Attaches a {@link Span} to a value without altering its own shape. */
export type Located<T> = T & { readonly span: Span };

/** A zero-length span at `offset` — for synthesized nodes with no source text. */
export function syntheticSpan(offset = 0): Span {
	return { start: offset, end: offset };
}

/** The smallest {@link Span} that contains both `a` and `b`. */
export function mergeSpans(a: Span, b: Span): Span {
	return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) };
}

/** The text of `source` covered by `span`. */
export function spanText(source: string, span: Span): string {
	return source.slice(span.start, span.end);
}
