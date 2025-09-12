/**
 * Utility type that excludes `undefined` from a type.
 *
 * Similar to `NonNullable<T>`, but only excludes `undefined`.
 *
 * Example:
 * ```ts
 * type A = Defined<string | number | undefined>; // string | number
 * type B = Defined<undefined>; // never
 * type C = Defined<string | null>; // string | null
 * ```
 */
export type Defined<T> = T extends undefined ? never : T;
