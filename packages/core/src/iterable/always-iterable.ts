/**
 * Normalises "one item or many" into an iterable, at a boundary where a caller
 * may pass either.
 *
 * A `string` is treated as a single item, never as a sequence of characters —
 * that is the whole point, and the case a bare `Array.isArray` check written at
 * each call site keeps getting right by accident and a `Symbol.iterator` check
 * gets wrong.
 *
 * An iterable is returned as-is rather than copied, so a one-shot source stays
 * one-shot.
 *
 * Time complexity: O(1).
 *
 * @param value A single item, or an iterable of them.
 * @returns `value` itself when it is a non-string iterable, otherwise a
 *   one-element iterable holding it.
 */
export function alwaysIterable<T>(value: T | Iterable<T>): Iterable<T> {
	// `typeof === "object"` is what excludes `string`: it is iterable but
	// primitive.
	if (typeof value === "object" && value !== null && Symbol.iterator in value) {
		// Safe: the guard above is exactly the `Iterable<T>` test, which TypeScript
		// cannot narrow a bare type parameter with.
		return value as Iterable<T>;
	}

	return [value as T];
}
