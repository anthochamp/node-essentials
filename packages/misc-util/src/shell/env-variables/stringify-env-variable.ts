import { UnimplementedError } from "../../ecma/error/unimplemented-error.js";
import { UnsupportedError } from "../../ecma/error/unsupported-error.js";
import { defaults } from "../../ecma/object/defaults.js";
import type { EnvVariableValue } from "./env-variables-types.js";

/**
 * Stringify a string environment variable value.
 *
 * If the string contains spaces, quotes, or equal signs, it will be quoted.
 *
 * @param value The string value to stringify.
 * @returns The stringified string value.
 */
export function stringifyEnvVariableStringValue(value: string): string {
	// biome-ignore lint/style/noNonNullAssertion: a string input won't produce undefined
	return /[\s"'=]/.test(value) ? JSON.stringify(value)! : value;
}

/**
 * Stringify a number or bigint environment variable value.
 *
 * @param value The number or bigint value to stringify.
 * @returns The stringified number or bigint value.
 */
export function stringifyEnvVariableNumberValue(
	value: number | bigint,
): string {
	return `${value}`;
}

export type EnvVariableBoolValueFlavor =
	| "1/0"
	| "true/false"
	| "yes/no"
	| "on/off";

/**
 * Stringify a boolean environment variable value according to the specified flavor.
 *
 * @param value The boolean value to stringify.
 * @param flavor The flavor to use for stringifying the boolean value.
 * @returns The stringified boolean value.
 */
export function stringifyEnvVariableBoolValue(
	value: boolean,
	flavor: EnvVariableBoolValueFlavor,
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

		default:
			throw new UnimplementedError(`flavor "${flavor}"`);
	}
}

export type StringifyEnvVariableValueOptions = {
	/**
	 * The flavor to use when stringifying boolean values.
	 * Defaults to "1/0".
	 */
	boolFlavor?: EnvVariableBoolValueFlavor;
};

const STRINGIFY_ENV_VARIABLE_VALUE_DEFAULT_OPTIONS: Required<StringifyEnvVariableValueOptions> =
	{
		boolFlavor: "1/0",
	};

/**
 * Stringify an environment variable value.
 *
 * @param value The environment variable value.
 * @param options Options for stringifying the value.
 * @returns The stringified environment variable value.
 */
export function stringifyEnvVariableValue(
	value: EnvVariableValue,
	options?: StringifyEnvVariableValueOptions,
): string {
	const effectiveOptions = defaults(
		options,
		STRINGIFY_ENV_VARIABLE_VALUE_DEFAULT_OPTIONS,
	);

	switch (typeof value) {
		case "string":
			return stringifyEnvVariableStringValue(value);

		case "number":
		case "bigint":
			return stringifyEnvVariableNumberValue(value);

		case "boolean":
			return stringifyEnvVariableBoolValue(value, effectiveOptions.boolFlavor);

		// biome-ignore lint/suspicious/noFallthroughSwitchClause: intended
		case "object":
			if (value === null) {
				return "";
			}
		// else, fall through to throw

		default:
			throw new UnsupportedError(`value type "${typeof value}"`);
	}
}

export type StringifyEnvVariableOptions = StringifyEnvVariableValueOptions;

const STRINGIFY_ENV_VARIABLE_DEFAULT_OPTIONS: Required<StringifyEnvVariableOptions> =
	{
		...STRINGIFY_ENV_VARIABLE_VALUE_DEFAULT_OPTIONS,
	};

/**
 * Stringify an environment variable assignment (e.g., `KEY=value`)
 *
 * @param name The environment variable name.
 * @param value The environment variable value.
 * @param options Options for stringifying the value.
 * @returns The stringified environment variable assignment.
 */
export function stringifyEnvVariable(
	name: string,
	value: EnvVariableValue,
	options?: StringifyEnvVariableOptions,
): string {
	const effectiveOptions = defaults(
		options,
		STRINGIFY_ENV_VARIABLE_DEFAULT_OPTIONS,
	);

	return `${name}=${stringifyEnvVariableValue(value, effectiveOptions)}`;
}
