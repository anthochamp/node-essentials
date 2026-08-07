import { defaults } from "../object/defaults.js";
import type { StringCaseOptions } from "./case-options.js";
import { STRING_CASE_DEFAULT_OPTIONS } from "./case-options.js";

export type KebabCaseFn = (input: string) => string;

/**
 * Creates a function that converts strings to kebab case.
 *
 * @param options Options to customise separators and kept characters.
 * @returns A function that converts strings to kebab case.
 */
export function buildKebabCase(options?: StringCaseOptions): KebabCaseFn {
	const { separators: sep, keep } = defaults(
		options,
		STRING_CASE_DEFAULT_OPTIONS,
	);
	const trimRe = new RegExp(`(?:^(?:${sep})+)|(?:(?:${sep})+$)`, "g");
	const mainRe = new RegExp(`(?:${sep})+((?:${keep})|$)`, "g");
	return (input) =>
		input
			.replace(trimRe, "")
			.toLowerCase()
			.replace(mainRe, (_, p1) => `-${(p1 ?? "").toLowerCase()}`);
}

/**
 * Converts a string to kebab case.
 *
 * @param input The input string.
 * @returns The kebab cased string.
 */
export const kebabCase: KebabCaseFn = buildKebabCase();
