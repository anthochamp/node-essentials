import { defaults } from "../object/defaults.js";
import type { StringCaseOptions } from "./case-options.js";
import { STRING_CASE_DEFAULT_OPTIONS } from "./case-options.js";

export type StartCaseFn = (input: string) => string;

/**
 * Creates a function that converts strings to start case.
 *
 * @param options Options to customise separators and kept characters.
 * @returns A function that converts strings to start case.
 */
export function buildStartCase(options?: StringCaseOptions): StartCaseFn {
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
			.replace(mainRe, (_, p1) => ` ${(p1 ?? "").toUpperCase()}`)
			.replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Converts a string to start case, replacing word separators with spaces and
 * capitalizing the first letter of each word.
 *
 * @param input The input string.
 * @returns The start cased string.
 */
export const startCase: StartCaseFn = buildStartCase();
