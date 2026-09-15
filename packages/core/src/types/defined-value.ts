/**
 * Constraint for a type parameter that must never include `undefined`.
 *
 * `undefined` is the absence of a value, not a value. An API that returns `T |
 * undefined` to mean "there is nothing here" cannot also carry `undefined` as
 * an element, because the two would be indistinguishable. Use `null` for a
 * value that means nothing.
 *
 * `{} | null` is every type except `undefined` and `void`.
 *
 * Example:
 *
 * ```ts
 * class Queue<T extends DefinedValue> {
 * 	dequeue(): T | undefined; // undefined can only mean "empty"
 * }
 * ```
 */
export type DefinedValue = {} | null;
