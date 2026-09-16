import { defaults, setRecordEntry } from "@ac-kit/core";

import { unquotePosixShWord } from "../command/unquote-posix-sh-word.js";
import {
	unquoteDotenvValue,
	unquoteWin32SetValue,
	unterminatedDotenvQuote,
} from "./_env-quoting.js";
import type { EnvAssignment, EnvSyntax } from "./types.js";

export type ParseEnvAssignmentOptions = {
	/** The surface syntax to read. Defaults to "assignment". */
	syntax?: EnvSyntax;
};

const PARSE_ENV_ASSIGNMENT_DEFAULT_OPTIONS_: Required<ParseEnvAssignmentOptions> =
	{
		syntax: "assignment",
	};

/**
 * Parse one environment variable assignment.
 *
 * A name with no `=` after it — `env(1)` and `docker --env` both accept one, to
 * mean "inherit this variable" — parses to an empty value.
 *
 * @param line The assignment to parse.
 * @param options Options for parsing the assignment.
 * @returns The parsed assignment, or `null` when the line carries none: a blank
 *   line or a comment in the syntaxes that have them.
 */
export function parseEnvAssignment(
	line: string,
	options?: ParseEnvAssignmentOptions,
): EnvAssignment | null {
	const { syntax } = defaults(options, PARSE_ENV_ASSIGNMENT_DEFAULT_OPTIONS_);

	// The bare form is one `execve` entry, so every byte after the first `=` is
	// part of the value — including whitespace, quotes and `#`.
	if (syntax === "assignment") {
		const eqIndex = line.indexOf("=");
		return eqIndex === -1
			? { name: line, value: "" }
			: { name: line.slice(0, eqIndex), value: line.slice(eqIndex + 1) };
	}

	let rest = line.trim();
	if (rest.length === 0 || rest.startsWith("#")) {
		return null;
	}

	switch (syntax) {
		case "dotenv":
		case "posix-export":
			rest = rest.replace(/^export\s+/, "");
			break;

		case "win32-set":
			rest = rest.replace(/^set\s+/i, "");
			if (rest.length >= 2 && rest.startsWith('"') && rest.endsWith('"')) {
				rest = rest.slice(1, -1);
			}
			break;
	}

	const eqIndex = rest.indexOf("=");
	if (eqIndex === -1) {
		return { name: rest, value: "" };
	}

	const name = rest.slice(0, eqIndex).trimEnd();
	const rawValue = rest.slice(eqIndex + 1);

	return { name, value: unquoteEnvValue_(rawValue, syntax) };
}

function unquoteEnvValue_(rawValue: string, syntax: EnvSyntax): string {
	switch (syntax) {
		case "posix-export":
			return unquotePosixShWord(rawValue.trim());

		case "win32-set":
			return unquoteWin32SetValue(rawValue);

		default:
			return unquoteDotenvValue(rawValue);
	}
}

export type ParseEnvOptions = ParseEnvAssignmentOptions & {
	/** The surface syntax to read. Defaults to "dotenv". */
	syntax?: EnvSyntax;
};

const PARSE_ENV_DEFAULT_OPTIONS_: Required<ParseEnvOptions> = {
	syntax: "dotenv",
};

/**
 * Parse a whole environment document into its variables, keyed by name.
 *
 * A later assignment to the same name wins, as it does in a shell. In the
 * quoted syntaxes a value may span lines, which is how a PEM key or a JSON blob
 * reaches a `.env` file.
 *
 * @param source The document to parse.
 * @param options Options for parsing the document.
 * @returns The parsed variables. Values are always strings; see
 *   `parseEnvValueAsNumber` and `parseEnvValueAsBool` to read one as something
 *   else.
 */
export function parseEnv(
	source: string,
	options?: ParseEnvOptions,
): Record<string, string> {
	const effectiveOptions = defaults(options, PARSE_ENV_DEFAULT_OPTIONS_);

	const result: Record<string, string> = {};
	const lines = source.split(/\r?\n/);

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i] as string;

		if (effectiveOptions.syntax !== "assignment") {
			const eqIndex = line.indexOf("=");
			if (eqIndex !== -1) {
				const quote = unterminatedDotenvQuote(line.slice(eqIndex + 1));
				while (quote !== null && i < lines.length - 1) {
					i++;
					line += `\n${lines[i]}`;
					if (unterminatedDotenvQuote(line.slice(eqIndex + 1)) === null) {
						break;
					}
				}
			}
		}

		const assignment = parseEnvAssignment(line, effectiveOptions);
		if (assignment !== null && assignment.name.length > 0) {
			setRecordEntry(result, assignment.name, assignment.value);
		}
	}

	return result;
}
