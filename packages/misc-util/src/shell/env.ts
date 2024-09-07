export type EnvVarName = string;
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type EnvVarValue = any;

export type EnvVars = Record<EnvVarName, EnvVarValue>;

export function stringifyEnvVar(key: EnvVarName, value: EnvVarValue) {
	let str: string;

	switch (typeof value) {
		case "string":
			str = /[\s"'=]/.test(value) ? JSON.stringify(value) : value;
			break;

		case "boolean":
		case "number":
		case "bigint":
			str = `${value}`;
			break;

		case "undefined":
			return "";

		case "object":
			str = value === null ? "" : JSON.stringify(value);
			break;

		case "function":
		case "symbol":
			throw new Error(`Unsupported value type "${typeof value}"`);
	}

	return `${key}=${str}`;
}
