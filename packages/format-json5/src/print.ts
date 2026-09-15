import json5 from "json5";

export type Json5PrintOptions = {
	indent?: number | string;
	replacer?: Parameters<typeof JSON.stringify>[1];
	quote?: string;
};

/** Serializes a value to a JSON5 string. */
export function printJson5(
	value: unknown,
	options?: Json5PrintOptions,
): string {
	try {
		return json5.stringify(value, {
			replacer: options?.replacer,
			space: options?.indent,
			quote: options?.quote,
		});
	} catch (error) {
		throw new Error("print JSON5", { cause: error });
	}
}
