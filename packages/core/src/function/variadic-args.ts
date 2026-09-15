/**
 * Support for functions that accept either a single array or the values
 * themselves.
 *
 * The variadic form reads well for a handful of literals — `mean(1, 2, 3)` —
 * but it is unusable on real data: spreading builds a fresh argument list, and
 * V8 throws `RangeError` somewhere past 100 000 arguments. Offering both shapes
 * costs one overload and one call to {@link fromVariadicArgs}.
 *
 * It only works for functions that accept primitive values or objects that are
 * not themselves arrays. The two shapes are distinguished by looking at the
 * first argument, so `VariadicArgs<[]>` would be ambiguous.
 *
 * @example
 * 	```ts
 *      export function sum(values: readonly number[]): number;
 *      export function sum(...values: number[]): number;
 *      export function sum(...args: VariadicArgs<number>): number {
 *              const values = fromVariadicArgs(args);
 *              // …
 *      }
 *      ```;
 */

/**
 * Rest parameter type for a function overloaded to accept an array or loose
 * values.
 *
 * @template T The element type. Must not itself be an array type: the two
 *   shapes are told apart by looking at the first argument, so
 *   `VariadicArgs<number[]>` would be ambiguous.
 */
export type VariadicArgs<T> = [readonly T[]] | T[];

/**
 * Reduces either accepted argument shape to a single array.
 *
 * @param args The raw rest arguments.
 * @returns The values. The array passed by the caller is returned as-is, not
 *   copied, so a function that reorders its input must take its own copy.
 */
export function fromVariadicArgs<T>(args: VariadicArgs<T>): readonly T[] {
	return args.length === 1 && Array.isArray(args[0])
		? (args[0] as readonly T[])
		: (args as T[]);
}
