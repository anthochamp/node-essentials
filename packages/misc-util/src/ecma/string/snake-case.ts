import { defaults } from "../object/defaults.js";
import type { StringCaseOptions } from "./case-options.js";
import { STRING_CASE_DEFAULT_OPTIONS } from "./case-options.js";

export type SnakeCaseFn = (input: string) => string;

/**
 * Creates a function that converts strings to snake case.
 *
 * Rules:
 * - Leading/trailing separators are removed.
 * - All letters are converted to lowercase.
 * - Separators are replaced with underscores.
 * - Multiple consecutive separators are collapsed to a single underscore.
 *
 * @param options Options to customise separators and kept characters.
 * @returns A function that converts strings to snake case.
 */
export function buildSnakeCase(
	options?: StringCaseOptions,
): (input: string) => string {
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
			.replace(mainRe, (_, p1) => `_${(p1 ?? "").toLowerCase()}`);
}

/**
 * Converts a string to snake case.
 *
 * @param input The input string.
 * @returns The snake cased string.
 */
export const snakeCase: SnakeCaseFn = buildSnakeCase();
