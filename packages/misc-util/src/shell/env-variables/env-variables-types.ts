/**
 * Possible environment variable values.
 */
export type EnvVariableValue = string | number | bigint | boolean | null;

/**
 * Environment variable definition.
 */
export type EnvVariable = {
	name: string;
	value: EnvVariableValue;
};

/**
 * Environment variables definition.
 */
export type EnvVariables = Record<string, EnvVariableValue>;
