import { defaults, UnsupportedError } from "@ac-kit/core";

import { escapePosixShCommandArg } from "../command/escape-posix-sh-command-arg.js";
import { quoteDotenvValue, quoteWin32SetValue } from "./_env-quoting.js";
import type {
	EnvBoolFlavor,
	EnvSyntax,
	EnvValue,
	EnvVariables,
} from "./types.js";

/**
 * A name is rejected rather than escaped: every syntax here reads the name up
 * to the first `=`, and a NUL cannot cross `execve` at all, so no spelling of
 * either would survive a round trip.
 */
const INVALID_ENV_NAME_RE_ = /[=\0\r\n]/;

/**
 * Print a boolean environment variable value in the given flavor.
 *
 * @param value The boolean value to print.
 * @param flavor How the boolean is spelled.
 * @returns The printed boolean value.
 */
export function printEnvBoolValue(
	value: boolean,
	flavor: EnvBoolFlavor,
): string {
	switch (flavor) {
		case "1/0":
			return value ? "1" : "0";

		case "true/false":
			return value ? "true" : "false";

		case "yes/no":
			return value ? "yes" : "no";

		case "on/off":
			return value ? "on" : "off";
	}
}

export type PrintEnvValueOptions = {
	/** How booleans are spelled. Defaults to "1/0". */
	boolFlavor?: EnvBoolFlavor;
};

const PRINT_ENV_VALUE_DEFAULT_OPTIONS_: Required<PrintEnvValueOptions> = {
	boolFlavor: "1/0",
};

/**
 * Print an environment variable value, unquoted.
 *
 * `null` prints as the empty string: an environment variable that exists with
 * no value is the closest thing the environment has to an absent one.
 *
 * @param value The value to print.
 * @param options Options for printing the value.
 * @returns The printed value, with no quoting applied.
 */
export function printEnvValue(
	value: EnvValue,
	options?: PrintEnvValueOptions,
): string {
	const effectiveOptions = defaults(options, PRINT_ENV_VALUE_DEFAULT_OPTIONS_);

	switch (typeof value) {
		case "string":
			return value;

		case "number":
		case "bigint":
			return `${value}`;

		case "boolean":
			return printEnvBoolValue(value, effectiveOptions.boolFlavor);

		case "object":
			if (value === null) {
				return "";
			}
		// else, fall through to throw

		default:
			throw new UnsupportedError(`value type "${typeof value}"`);
	}
}

export type PrintEnvAssignmentOptions = PrintEnvValueOptions & {
	/** The surface syntax to print. Defaults to "assignment". */
	syntax?: EnvSyntax;
};

const PRINT_ENV_ASSIGNMENT_DEFAULT_OPTIONS_: Required<PrintEnvAssignmentOptions> =
	{
		...PRINT_ENV_VALUE_DEFAULT_OPTIONS_,
		syntax: "assignment",
	};

/**
 * Print one environment variable assignment in the given syntax, quoting the
 * value as that syntax requires so that `parseEnvAssignment` reads back exactly
 * the value given.
 *
 * @param name The environment variable name.
 * @param value The environment variable value.
 * @param options Options for printing the assignment.
 * @returns The printed assignment.
 * @throws {UnsupportedError} If the name contains `=`, NUL or a line break, or
 *   if the value has no representation in the requested syntax.
 */
export function printEnvAssignment(
	name: string,
	value: EnvValue,
	options?: PrintEnvAssignmentOptions,
): string {
	const { syntax, ...valueOptions } = defaults(
		options,
		PRINT_ENV_ASSIGNMENT_DEFAULT_OPTIONS_,
	);

	if (name.length === 0 || INVALID_ENV_NAME_RE_.test(name)) {
		throw new UnsupportedError(`environment variable name "${name}"`);
	}

	const printedValue = printEnvValue(value, valueOptions);

	switch (syntax) {
		case "assignment":
			if (printedValue.includes("\0")) {
				throw new UnsupportedError("environment value containing NUL");
			}
			return `${name}=${printedValue}`;

		case "dotenv":
			return `${name}=${quoteDotenvValue(printedValue)}`;

		case "posix-export":
			return `export ${name}=${escapePosixShCommandArg(printedValue)}`;

		case "win32-set":
			return `set "${name}=${quoteWin32SetValue(printedValue)}"`;
	}
}

export type PrintEnvOptions = PrintEnvValueOptions & {
	/** The surface syntax to print. Defaults to "dotenv". */
	syntax?: EnvSyntax;

	/** The line separator between assignments. Defaults to "\n". */
	newline?: string;
};

const PRINT_ENV_DEFAULT_OPTIONS_: Required<PrintEnvOptions> = {
	...PRINT_ENV_VALUE_DEFAULT_OPTIONS_,
	syntax: "dotenv",
	newline: "\n",
};

/**
 * Print a whole set of environment variables as a document, one assignment per
 * line, terminated by a trailing line separator.
 *
 * @param variables The environment variables to print, keyed by name.
 * @param options Options for printing the document.
 * @returns The printed document, empty when there is no variable to print.
 * @throws {UnsupportedError} If a name or a value has no representation in the
 *   requested syntax.
 */
export function printEnv(
	variables: Readonly<EnvVariables>,
	options?: PrintEnvOptions,
): string {
	const { newline, ...assignmentOptions } = defaults(
		options,
		PRINT_ENV_DEFAULT_OPTIONS_,
	);

	const lines: string[] = [];
	for (const [name, value] of Object.entries(variables)) {
		lines.push(printEnvAssignment(name, value, assignmentOptions));
	}

	return lines.length === 0 ? "" : `${lines.join(newline)}${newline}`;
}
