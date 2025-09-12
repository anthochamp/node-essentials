import type { EnvVariable, EnvVariableValue } from "./env-variables-types.js";

/**
 * Parse a string as an environment variable definition.
 *
 * If the string does not contain an equal sign, the variable value will be null.
 *
 * @param value The environment variable string to parse.
 * @returns The parsed environment variable.
 */
export function parseEnvVariable(value: string): EnvVariable {
	const eqIndex = value.indexOf("=");
	if (eqIndex === -1) {
		return { name: value, value: null };
	}

	const name = value.substring(0, eqIndex);
	const rawValue = value.substring(eqIndex + 1);
	return { name, value: parseEnvVariableValue(rawValue) };
}

/**
 * Parse a string value as an environment variable value.
 *
 * @param value The string value to parse.
 * @returns The parsed string, number, bigint, boolean value, or null if the input is null or empty.
 */
export function parseEnvVariableValue(
	value: string | undefined | null,
): EnvVariableValue {
	if (!value) {
		return null;
	}

	const num = parseEnvVariableValueAsNumber(value);
	if (num !== null) {
		return num;
	}

	const bool = parseEnvVariableValueAsBool(value);
	if (bool !== null) {
		return bool;
	}

	return parseEnvVariableValueAsString(value);
}

/**
 * Parse a string value as a string environment variable value.
 *
 * @param value The string value to parse.
 * @returns The parsed string value, or null if the value is null or empty.
 */
export function parseEnvVariableValueAsString(
	value: string | undefined | null,
): string | null {
	if (!value || value.length === 0) {
		return null;
	}

	if (value.startsWith('"') && value.endsWith('"')) {
		return JSON.parse(value) as string;
	}

	return value;
}

/**
 * Parse a string value as a number or bigint environment variable value.
 *
 * @param value The string value to parse.
 * @returns The parsed number or bigint value, or null if the value is not a valid number or bigint representation.
 */
export function parseEnvVariableValueAsNumber(
	value: string | undefined | null,
): number | bigint | null {
	if (!value) {
		return null;
	}

	try {
		const bn = BigInt(value);
		if (
			bn >= BigInt(Number.MIN_SAFE_INTEGER) &&
			bn <= BigInt(Number.MAX_SAFE_INTEGER)
		) {
			return Number(bn);
		}

		return bn;
	} catch {
		const num = Number(value);
		if (!Number.isNaN(num)) {
			return num;
		}
	}

	return null;
}

/**
 * Parse a string value as a boolean environment variable value.
 *
 * @param value The string value to parse.
 * @returns The parsed boolean value, or null if the value is not a valid boolean representation.
 */
export function parseEnvVariableValueAsBool(
	value: string | undefined | null,
): boolean | null {
	if (!value) {
		return null;
	}

	switch (value.toLowerCase()) {
		case "1":
		case "true":
		case "yes":
		case "on":
			return true;

		case "0":
		case "false":
		case "no":
		case "off":
			return false;

		default:
			break;
	}

	return null;
}
