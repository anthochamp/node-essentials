import { defaults } from "../object/defaults.js";
import type { StringCaseOptions } from "./case-options.js";
import { STRING_CASE_DEFAULT_OPTIONS } from "./case-options.js";

export type UpperCaseFn = (input: string) => string;

/**
 * Creates a function that converts strings to upper case with spaces.
 *
 * @param options Options to customise separators and kept characters.
 * @returns A function that converts strings to upper case with spaces.
 */
export function buildUpperCase(options?: StringCaseOptions): UpperCaseFn {
	const { separators: sep, keep } = defaults(
		options,
		STRING_CASE_DEFAULT_OPTIONS,
	);
	const trimRe = new RegExp(`(?:^(?:${sep})+)|(?:(?:${sep})+$)`, "g");
	const mainRe = new RegExp(`(?:${sep})+((?:${keep})|$)`, "g");
	return (input) =>
		input
			.replace(trimRe, "")
			.toUpperCase()
			.replace(mainRe, (_, p1) => ` ${(p1 ?? "").toUpperCase()}`);
}

/**
 * Converts a string to upper case, replacing word separators with spaces.
 *
 * @param input The input string.
 * @returns The string converted to upper case, with word separators replaced by spaces.
 */
export const upperCase: UpperCaseFn = buildUpperCase();
