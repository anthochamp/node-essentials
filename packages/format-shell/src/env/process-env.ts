import { setRecordEntry } from "@ac-kit/core";

import { printEnvValue, type PrintEnvValueOptions } from "./print-env.js";
import type { EnvVariables } from "./types.js";

export type ProcessEnv = Record<string, string>;

/**
 * Convert printable environment variables to the string record
 * `child_process.spawn` and its siblings accept.
 *
 * @param variables The environment variables to convert.
 * @param options Options for printing each value.
 * @returns The variables with every value printed as a string.
 */
export function toProcessEnv(
	variables: Readonly<EnvVariables>,
	options?: PrintEnvValueOptions,
): ProcessEnv {
	const result: ProcessEnv = {};

	for (const [name, value] of Object.entries(variables)) {
		setRecordEntry(result, name, printEnvValue(value, options));
	}

	return result;
}

/**
 * Convert a `process.env`-shaped record to a string record, dropping the names
 * that are present but unset.
 *
 * @param env The environment to convert.
 * @returns The environment with every unset name removed.
 */
export function fromProcessEnv(
	env: Readonly<Record<string, string | undefined>>,
): ProcessEnv {
	const result: ProcessEnv = {};

	for (const [name, value] of Object.entries(env)) {
		if (value !== undefined) {
			setRecordEntry(result, name, value);
		}
	}

	return result;
}
