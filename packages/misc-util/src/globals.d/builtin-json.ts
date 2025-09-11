import type { JsonValue } from "type-fest";

declare global {
	export type JsonReplacerFunction = (
		this: unknown,
		key: string,
		value: unknown,
	) => unknown;

	export type JsonReplacer = JsonReplacerFunction | (string | number)[] | null;

	export type JsonReviverFunction = (
		this: unknown,
		key: string,
		value: unknown,
	) => unknown;

	export type JsonReviver = JsonReviverFunction | null;

	/**
	 * Override the global JSON interface to use the custom JsonReplacer and JsonReviver types
	 * and to fix the return type of JSON.stringify to include undefined.
	 *
	 * An issue has been marked as wontfix in TypeScript regarding this:
	 * https://github.com/microsoft/TypeScript/issues/18879#issuecomment-1399758565
	 */
	interface JSON {
		stringify(
			value: unknown,
			replacer?: JsonReplacer,
			space?: string | number,
		): string | undefined;

		parse(text: string, reviver?: JsonReviver): JsonValue;
	}
}
