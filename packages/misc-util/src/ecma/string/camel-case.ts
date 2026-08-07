import { defaults } from "../object/defaults.js";
import type { StringCaseOptions } from "./case-options.js";
import { STRING_CASE_DEFAULT_OPTIONS } from "./case-options.js";

export type CamelCaseFn = (input: string) => string;

/**
 * Creates a function that converts strings to camel case.
 *
 * @param options Options to customise separators and kept characters.
 * @returns A function that converts strings to camel case.
 */
export function buildCamelCase(options?: StringCaseOptions): CamelCaseFn {
	const { separators: sep, keep } = defaults(
		options,
		STRING_CASE_DEFAULT_OPTIONS,
	);
	const leadingRe = new RegExp(`^(?:${sep})+`);
	const mainRe = new RegExp(`(?:${sep})+((?:${keep})|$)`, "g");
	return (input) =>
		input
			.replace(leadingRe, "")
			.toLowerCase()
			.replace(mainRe, (_, p1) => (p1 ?? "").toUpperCase());
}

/**
 * Converts a string to camel case.
 *
 * @param input The input string.
 * @returns The camel cased string.
 */
export const camelCase: CamelCaseFn = buildCamelCase();
