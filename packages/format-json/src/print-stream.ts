import { textPrintTransformer } from "@ac-kit/format-core";
import type { JsonValue } from "type-fest";

export type JsonPrintStreamOptions = {
	/** Number of spaces or a string used for indentation. */
	indent?: number | string;
	/** Replacer function passed to `JSON.stringify`. */
	replacer?: Parameters<typeof JSON.stringify>[1];
};

/** Emits each incoming {@link JsonValue} as UTF-8 encoded JSON. */
export class JsonPrintStream extends TransformStream<JsonValue, Uint8Array> {
	constructor(options: JsonPrintStreamOptions = {}) {
		// biome-ignore lint/suspicious/noExplicitAny: JSON.stringify overload resolution fails in TS7 when the replacer type is widened
		const stringify = JSON.stringify as (
			v: unknown,
			r?: any,
			s?: string | number,
		) => string;
		super(
			textPrintTransformer(
				(value) => stringify(value, options.replacer, options.indent),
				"JSON",
			),
		);
	}
}
