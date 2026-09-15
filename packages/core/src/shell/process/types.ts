export type EnvVariableValue = string | number | bigint | boolean | null;

export type EnvVariable = {
	name: string;
	value: EnvVariableValue;
};

export type EnvVariables = Record<string, EnvVariableValue>;
