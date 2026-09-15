/** Byte-offset range [start, end) within the source string. */
export interface Span {
	readonly start: number;
	readonly end: number;
}

/** Helper: wraps a value with a span. */
export type WithSpan<T> = T & { readonly span: Span };

/** A zero-length span at a given offset — used for synthesised nodes. */
export function syntheticSpan(offset = 0): Span {
	return { start: offset, end: offset };
}
