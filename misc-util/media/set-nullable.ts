import type { Except, Simplify } from "type-fest";

/**
 * Utility type that makes the specified keys of an object type nullable (i.e., allows them to be `null`).
 *
 * Example:
 * ```ts
 * type A = SetNullable<{ a: string; b: number; c: boolean }, "a" | "c">;
 * // Result: { a: string | null; b: number; c: boolean | null }
 * ```
 *
 * If no keys are specified, all properties of the object type will be made nullable.
 *
 * Example:
 * ```ts
 * type B = SetNullable<{ a: string; b: number }>;
 * // Result: { a: string | null; b: number | null }
 * ```
 *
 * @template BaseType The base object type.
 * @template Keys The keys of the object type to make nullable. Defaults to all keys of the object type.
 */
export type SetNullable<
	BaseType,
	Keys extends keyof BaseType = keyof BaseType,
> = Simplify<
	Except<BaseType, Keys> & {
		[K in Keys]: BaseType[K] | null;
	}
>;
