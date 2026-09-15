export type JsonPrintOptions = {
	/** Number of spaces or a string used for indentation. */
	indent?: number | string;
	/** Replacer function passed to `JSON.stringify`. */
	replacer?: Parameters<typeof JSON.stringify>[1];
};

/** Serializes a value to a JSON string. */
export function printJson(value: unknown, options?: JsonPrintOptions): string {
	try {
		return JSON.stringify(value, options?.replacer, options?.indent) ?? "null";
	} catch (error) {
		throw new Error("print JSON", { cause: error });
	}
}
