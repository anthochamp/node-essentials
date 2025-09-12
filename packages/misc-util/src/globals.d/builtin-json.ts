import type { JsonValue } from "type-fest";

declare global {
	/**
	 * The function type of the `replacer` parameter in `JSON.stringify` method.
	 */
	export type JsonReplacerFunction = (
		this: unknown,
		key: string,
		value: unknown,
	) => unknown;

	/**
	 * The type of the `replacer` parameter in `JSON.stringify` method.
	 */
	export type JsonReplacer = JsonReplacerFunction | (string | number)[] | null;

	/**
	 * The function type of the `reviver` parameter in `JSON.parse` method.
	 */
	export type JsonReviverFunction = (
		this: unknown,
		key: string,
		value: unknown,
	) => unknown;

	/**
	 * The type of the `reviver` parameter in `JSON.parse` method.
	 */
	export type JsonReviver = JsonReviverFunction | null;

	/**
	 * Override the global JSON interface to use the custom JsonReplacer and JsonReviver types
	 * and to fix the return type of JSON.stringify to include undefined.
	 *
	 * An issue has been marked as wontfix in TypeScript regarding this:
	 * https://github.com/microsoft/TypeScript/issues/18879#issuecomment-1399758565
	 */
	interface JSON {
		/**
		 * Stringifies a value to JSON, with support for a replacer function/array
		 * and space argument.
		 *
		 * Returns `undefined` if the value cannot be stringified (e.g., `undefined`,
		 * function, or symbol at the root level).
		 *
		 * @remarks
		 * This is a global type augmentation.
		 *
		 * @param value The value to stringify.
		 * @param replacer Optional replacer function or array.
		 * @param space Optional space argument for pretty-printing.
		 * @returns The JSON string or `undefined`.
		 */
		stringify(
			value: unknown,
			replacer?: JsonReplacer,
			space?: string | number,
		): string | undefined;

		/**
		 * Parses a JSON string, with support for an optional reviver function.
		 *
		 * @remarks
		 * This is a global type augmentation.
		 *
		 * @param text The JSON string to parse.
		 * @param reviver Optional reviver function.
		 * @returns The parsed JSON value.
		 */
		parse(text: string, reviver?: JsonReviver): JsonValue;
	}
}
