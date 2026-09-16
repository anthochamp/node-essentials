import { parseNumberOrBigInt } from "@ac-kit/core";

/**
 * Read an environment variable value as a number.
 *
 * An integer beyond the safe range is returned as a `bigint`, so a value is
 * never silently rounded.
 *
 * @param value The value to read.
 * @returns The number or bigint it spells, or null if it spells neither.
 */
export function parseEnvValueAsNumber(
	value: string | undefined | null,
): number | bigint | null {
	if (!value) {
		return null;
	}

	return parseNumberOrBigInt(value);
}

/**
 * Read an environment variable value as a boolean.
 *
 * Recognises every flavor `printEnvBoolValue` writes, case-insensitively.
 *
 * @param value The value to read.
 * @returns The boolean it spells, or null if it spells none.
 */
export function parseEnvValueAsBool(
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
			return null;
	}
}
