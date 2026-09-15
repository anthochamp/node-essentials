import type { JsonValue } from "type-fest";

export type JsoncPrintOptions = {
	indent?: number | string;
	replacer?: Parameters<typeof JSON.stringify>[1];
};

/** Serializes a value to a JSON string (comments are not preserved in print). */
export function printJsonc(
	value: JsonValue,
	options?: JsoncPrintOptions,
): string {
	return JSON.stringify(value, options?.replacer, options?.indent) ?? "null";
}
