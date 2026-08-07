import { defaults } from "../object/defaults.js";
import type { StringCaseOptions } from "./case-options.js";
import { STRING_CASE_DEFAULT_OPTIONS } from "./case-options.js";

export type LowerCaseFn = (input: string) => string;

/**
 * Creates a function that converts strings to lower case with spaces.
 *
 * @param options Options to customise separators and kept characters.
 * @returns A function that converts strings to lower case with spaces.
 */
export function buildLowerCase(options?: StringCaseOptions): LowerCaseFn {
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
			.replace(mainRe, (_, p1) => ` ${(p1 ?? "").toLowerCase()}`);
}

/**
 * Converts a string to lower case, replacing word separators with spaces.
 *
 * @param input The input string.
 * @returns The lower cased string.
 */
export const lowerCase: LowerCaseFn = buildLowerCase();
