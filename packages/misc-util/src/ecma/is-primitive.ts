import type { Primitive } from "type-fest";

/**
 * Check if a value is a primitive.
 *
 * A primitive is a value that is not an object and has no methods. There are 7
 * primitive data types: string, number, bigint, boolean, symbol, null, and
 * undefined.
 *
 * @param value The value to check
 * @returns True if the value is a primitive
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Primitive
 */
export function isPrimitive(value: unknown): value is Primitive {
	return (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "bigint" ||
		typeof value === "boolean" ||
		typeof value === "symbol" ||
		value === null ||
		value === undefined
	);
}
